import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { z } from 'zod';

import { gradeQuiz, type GradableQuestion } from '../../../utils/quiz-grading';
import type { quizCreateSchema, quizUpdateSchema } from '../../../utils/validation';

type QuizCreateInput = z.infer<typeof quizCreateSchema>;
type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;
type QuizQuestion = GradableQuestion & { prompt: string };
type QuizDocument = {
  documentId: string;
  title: string;
  questions?: Array<QuizQuestion & { id?: number }>;
  course?: { documentId: string; title?: string } | null;
};

const { NotFoundError } = errors;

function quizDto(quiz: QuizDocument, includeAnswers: boolean) {
  return {
    documentId: quiz.documentId,
    title: quiz.title,
    questions: (quiz.questions ?? []).map((question) => ({
      prompt: question.prompt,
      options: question.options,
      ...(includeAnswers ? { correctOption: question.correctOption } : {}),
    })),
  };
}

export default factories.createCoreService('api::quiz.quiz', ({ strapi }) => {
  async function findQuiz(documentId: string) {
    return (await strapi.documents('api::quiz.quiz').findOne({
      documentId,
      fields: ['title'],
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
        select: ['documentId', 'title'],
        populate: { questions: true },
        orderBy: { createdAt: 'asc' },
      })) as unknown as QuizDocument[];
      return quizzes.map((quiz) => quizDto(quiz, includeAnswers));
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

    async createForCourse(courseDocumentId: string, input: QuizCreateInput) {
      const quiz = (await strapi.documents('api::quiz.quiz').create({
        data: { ...input, course: courseDocumentId } as never,
        populate: { questions: true },
      })) as unknown as QuizDocument;
      return quizDto(quiz, true);
    },

    async updateManaged(quizDocumentId: string, input: QuizUpdateInput) {
      const quiz = (await strapi.documents('api::quiz.quiz').update({
        documentId: quizDocumentId,
        data: input as never,
        populate: { questions: true },
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
      const quiz = await requireQuizInCourse(courseDocumentId, quizDocumentId);
      const questions = quiz.questions ?? [];
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
