import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { z } from 'zod';

import { gradeQuiz, type GradableQuestion } from '../../../utils/quiz-grading';
import type { quizCreateSchema, quizUpdateSchema } from '../../../utils/validation';
import { acquirePostgresTransactionLock } from '../../../utils/database-lock';

type QuizCreateInput = z.infer<typeof quizCreateSchema>;
type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;
type QuizQuestion = GradableQuestion & { prompt: string };
type QuizDocument = {
  documentId: string;
  title: string;
  position: number;
  questions?: Array<QuizQuestion & { id?: number }>;
  course?: { documentId: string; title?: string } | null;
};

type LearningProgressService = {
  assertQuizUnlocked(
    studentId: number,
    courseDocumentId: string,
    quizDocumentId: string
  ): Promise<unknown>;
};

const { NotFoundError, ValidationError } = errors;

const courseStepOrderLock = (courseDocumentId: string) =>
  `lms:course-step-order:${courseDocumentId}`;

function quizDto(quiz: QuizDocument, includeAnswers: boolean) {
  return {
    documentId: quiz.documentId,
    title: quiz.title,
    position: quiz.position,
    questions: (quiz.questions ?? []).map((question) => ({
      prompt: question.prompt,
      options: question.options,
      ...(includeAnswers ? { correctOption: question.correctOption } : {}),
    })),
  };
}

function quizSummaryDto(quiz: QuizDocument) {
  return {
    documentId: quiz.documentId,
    title: quiz.title,
    position: quiz.position,
    questionCount: quiz.questions?.length ?? 0,
  };
}

export default factories.createCoreService('api::quiz.quiz', ({ strapi }) => {
  async function assertStudentCanOpenQuiz(
    studentId: number,
    courseDocumentId: string,
    quizDocumentId: string
  ) {
    const progress = strapi.service(
      'api::lesson-progress.lesson-progress'
    ) as unknown as LearningProgressService;
    await progress.assertQuizUnlocked(
      studentId,
      courseDocumentId,
      quizDocumentId
    );
  }

  async function findQuiz(documentId: string) {
    return (await strapi.documents('api::quiz.quiz').findOne({
      documentId,
      fields: ['title', 'position'],
      populate: { questions: true },
    })) as unknown as QuizDocument | null;
  }

  async function requireQuizInCourse(courseDocumentId: string, quizDocumentId: string) {
    const quiz = await findQuiz(quizDocumentId);
    const belongsToCourse = await strapi.db.query('api::quiz.quiz').findOne({
      where: {
        documentId: quizDocumentId,
        course: { documentId: courseDocumentId },
      },
      select: ['id'],
    });
    if (!quiz || !belongsToCourse) {
      throw new NotFoundError('Quiz not found in this course.');
    }
    return quiz;
  }

  return {
    async findForCourse(courseDocumentId: string, includeAnswers: boolean) {
      const quizzes = (await strapi.db.query('api::quiz.quiz').findMany({
        where: { course: { documentId: courseDocumentId } },
        select: ['documentId', 'title', 'position'],
        populate: { questions: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      })) as unknown as QuizDocument[];
      return quizzes.map((quiz) => quizDto(quiz, includeAnswers));
    },

    async findSummariesForCourse(courseDocumentId: string) {
      const quizzes = (await strapi.db.query('api::quiz.quiz').findMany({
        where: { course: { documentId: courseDocumentId } },
        select: ['documentId', 'title', 'position'],
        populate: { questions: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      })) as unknown as QuizDocument[];
      return quizzes.map(quizSummaryDto);
    },

    async findOneForCourse(
      courseDocumentId: string,
      quizDocumentId: string,
      includeAnswers: boolean
    ) {
      return quizDto(
        await requireQuizInCourse(courseDocumentId, quizDocumentId),
        includeAnswers
      );
    },

    async findOneForStudent(
      studentId: number,
      courseDocumentId: string,
      quizDocumentId: string
    ) {
      await assertStudentCanOpenQuiz(
        studentId,
        courseDocumentId,
        quizDocumentId
      );
      return quizDto(
        await requireQuizInCourse(courseDocumentId, quizDocumentId),
        false
      );
    },

    async createForCourse(courseDocumentId: string, input: QuizCreateInput) {
      const quiz = (await strapi.db.transaction(async ({ trx }) => {
        await acquirePostgresTransactionLock(
          trx,
          courseStepOrderLock(courseDocumentId)
        );
        const [lessonConflict, quizConflict] = await Promise.all([
          strapi.db.query('api::lesson.lesson').findOne({
            where: { course: { documentId: courseDocumentId }, position: input.position },
            select: ['id'],
          }),
          strapi.db.query('api::quiz.quiz').findOne({
            where: { course: { documentId: courseDocumentId }, position: input.position },
            select: ['id'],
          }),
        ]);
        if (lessonConflict || quizConflict) {
          throw new ValidationError(
            `Course step position ${input.position} is already used in this course.`
          );
        }
        return strapi.documents('api::quiz.quiz').create({
          data: { ...input, course: courseDocumentId } as never,
          populate: { questions: true },
        });
      })) as unknown as QuizDocument;
      return quizDto(quiz, true);
    },

    async updateManaged(quizDocumentId: string, input: QuizUpdateInput) {
      const quiz = (await strapi.db.transaction(async ({ trx }) => {
        const current = (await strapi.db.query('api::quiz.quiz').findOne({
          where: { documentId: quizDocumentId },
          select: ['documentId', 'position'],
          populate: { course: { select: ['documentId'] } },
        })) as unknown as QuizDocument | null;
        if (!current?.course) throw new NotFoundError('Quiz not found.');

        await acquirePostgresTransactionLock(
          trx,
          courseStepOrderLock(current.course.documentId)
        );
        if (input.position !== undefined && input.position !== current.position) {
          const [lessonConflict, quizConflict] = await Promise.all([
            strapi.db.query('api::lesson.lesson').findOne({
              where: {
                course: { documentId: current.course.documentId },
                position: input.position,
              },
              select: ['documentId'],
            }),
            strapi.db.query('api::quiz.quiz').findOne({
              where: {
                course: { documentId: current.course.documentId },
                position: input.position,
              },
              select: ['documentId'],
            }),
          ]);
          if (
            lessonConflict ||
            (quizConflict && quizConflict.documentId !== quizDocumentId)
          ) {
            throw new ValidationError(
              `Course step position ${input.position} is already used in this course.`
            );
          }
        }
        return strapi.documents('api::quiz.quiz').update({
          documentId: quizDocumentId,
          data: input as never,
          populate: { questions: true },
        });
      })) as unknown as QuizDocument;
      return quizDto(quiz, true);
    },

    async deleteManaged(quizDocumentId: string) {
      await strapi.db.query('api::quiz-attempt.quiz-attempt').deleteMany({
        where: { quiz: { documentId: quizDocumentId } },
      });
      await strapi.documents('api::quiz.quiz').delete({ documentId: quizDocumentId });
      return { documentId: quizDocumentId };
    },

    async submit(
      studentId: number,
      courseDocumentId: string,
      quizDocumentId: string,
      answers: number[]
    ) {
      await assertStudentCanOpenQuiz(
        studentId,
        courseDocumentId,
        quizDocumentId
      );
      const quiz = await requireQuizInCourse(courseDocumentId, quizDocumentId);
      const questions = quiz.questions ?? [];
      if (answers.length !== questions.length) {
        throw new ValidationError('Answer every quiz question exactly once.');
      }
      const hasInvalidOption = answers.some(
        (answer, index) => answer >= questions[index].options.length
      );
      if (hasInvalidOption) {
        throw new ValidationError('A submitted answer is not a valid option.');
      }
      const result = gradeQuiz(questions, answers);
      const attempt = (await strapi
        .documents('api::quiz-attempt.quiz-attempt')
        .create({
          data: {
            student: studentId,
            quiz: quizDocumentId,
            answers: result.answers,
            score: result.score,
            total: result.total,
            submittedAt: new Date().toISOString(),
          } as never,
        })) as unknown as { documentId: string; submittedAt: string };

      return {
        documentId: attempt.documentId,
        quizDocumentId,
        submittedAt: attempt.submittedAt,
        ...result,
      };
    },
  };
});
