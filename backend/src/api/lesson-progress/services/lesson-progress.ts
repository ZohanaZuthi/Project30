import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { calculateProgress } from '../../../utils/progress';
import {
  addLearningStepLocks,
  learningStepKey,
  type OrderedLearningStep,
} from '../../../utils/lesson-sequence';
import { lessonProgressKey } from '../../../utils/unique-key';

const { ForbiddenError, NotFoundError } = errors;

type LessonSummary = { documentId: string; title: string; position: number };
type CompletedLesson = {
  documentId: string;
  completedAt: string;
  lesson?: LessonSummary | null;
};
type QuizSummary = { documentId: string; title: string; position: number };
type QuizAttemptSummary = {
  submittedAt: string;
  quiz?: QuizSummary | null;
};
type EnrollmentWithStudent = {
  student?: {
    id: number;
    documentId: string;
    username: string;
    email: string;
  } | null;
};

export default factories.createCoreService(
  'api::lesson-progress.lesson-progress',
  ({ strapi }) => {
    async function lessonsForCourse(courseDocumentId: string) {
      return (await strapi.db.query('api::lesson.lesson').findMany({
        where: { course: { documentId: courseDocumentId } },
        select: ['documentId', 'title', 'position'],
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      })) as unknown as LessonSummary[];
    }

    async function quizzesForCourse(courseDocumentId: string) {
      return (await strapi.db.query('api::quiz.quiz').findMany({
        where: { course: { documentId: courseDocumentId } },
        select: ['documentId', 'title', 'position'],
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      })) as unknown as QuizSummary[];
    }

    async function progressForStudent(studentId: number, courseDocumentId: string) {
      const [lessons, quizzes] = await Promise.all([
        lessonsForCourse(courseDocumentId),
        quizzesForCourse(courseDocumentId),
      ]);
      const lessonIds = lessons.map(({ documentId }) => documentId);
      const quizIds = quizzes.map(({ documentId }) => documentId);
      const [records, attempts] = await Promise.all([
        lessonIds.length
          ? (strapi.documents('api::lesson-progress.lesson-progress').findMany({
              filters: {
                student: { id: studentId },
                lesson: { documentId: { $in: lessonIds } },
              },
              fields: ['completedAt'],
              populate: {
                lesson: { fields: ['documentId', 'title', 'position'] },
              },
            }) as unknown as Promise<CompletedLesson[]>)
          : Promise.resolve([] as CompletedLesson[]),
        quizIds.length
          ? (strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
              filters: {
                student: { id: studentId },
                quiz: { documentId: { $in: quizIds } },
              },
              fields: ['submittedAt'],
              populate: { quiz: { fields: ['documentId', 'title', 'position'] } },
              sort: ['submittedAt:desc'],
            }) as unknown as Promise<QuizAttemptSummary[]>)
          : Promise.resolve([] as QuizAttemptSummary[]),
      ]);

      const completedLessonIds = new Set(
        records.flatMap((record) =>
          record.lesson ? [record.lesson.documentId] : []
        )
      );
      const completedQuizIds = new Set(
        attempts.flatMap((attempt) =>
          attempt.quiz ? [attempt.quiz.documentId] : []
        )
      );
      const completedAtByStep = new Map<string, string>();
      records.forEach((record) => {
        if (record.lesson) {
          completedAtByStep.set(
            learningStepKey('lesson', record.lesson.documentId),
            record.completedAt
          );
        }
      });
      attempts.forEach((attempt) => {
        if (!attempt.quiz) return;
        const key = learningStepKey('quiz', attempt.quiz.documentId);
        if (!completedAtByStep.has(key)) {
          completedAtByStep.set(key, attempt.submittedAt);
        }
      });

      const steps: OrderedLearningStep[] = [
        ...lessons.map((lesson) => ({ ...lesson, kind: 'lesson' as const })),
        ...quizzes.map((quiz) => ({
          ...quiz,
          kind: 'quiz' as const,
        })),
      ].sort((a, b) => a.position - b.position);
      const completedStepKeys = new Set([
        ...[...completedLessonIds].map((id) => learningStepKey('lesson', id)),
        ...[...completedQuizIds].map((id) => learningStepKey('quiz', id)),
      ]);
      const orderedSteps = addLearningStepLocks(steps, completedStepKeys).map(
        (step) => {
          const key = learningStepKey(step.kind, step.documentId);
          return {
            ...step,
            completed: completedStepKeys.has(key),
            completedAt: completedAtByStep.get(key) ?? null,
          };
        }
      );
      const summary = calculateProgress(steps.length, completedStepKeys.size);

      return {
        totalSteps: summary.totalLessons,
        completedSteps: summary.completedLessons,
        totalLessons: lessons.length,
        completedLessons: completedLessonIds.size,
        totalQuizzes: quizzes.length,
        completedQuizzes: completedQuizIds.size,
        percentage: summary.percentage,
        steps: orderedSteps,
        lessons: orderedSteps.filter(({ kind }) => kind === 'lesson'),
        quizzes: orderedSteps.filter(({ kind }) => kind === 'quiz'),
      };
    }

    return {
      async complete(
        studentId: number,
        courseDocumentId: string,
        lessonDocumentId: string
      ) {
        const lesson = (await strapi.db.query('api::lesson.lesson').findOne({
          where: {
            documentId: lessonDocumentId,
            course: { documentId: courseDocumentId },
          },
          select: ['documentId', 'title', 'position'],
        })) as LessonSummary | null;

        if (!lesson) {
          throw new NotFoundError('Lesson not found in this course.');
        }

        await this.assertLessonUnlocked(
          studentId,
          courseDocumentId,
          lessonDocumentId
        );

        const key = lessonProgressKey(studentId, lessonDocumentId);
        let record = (await strapi
          .documents('api::lesson-progress.lesson-progress')
          .findFirst({ filters: { uniqueKey: key }, fields: ['completedAt'] })) as unknown as CompletedLesson | null;
        let alreadyCompleted = Boolean(record);

        if (!record) {
          try {
            record = (await strapi
              .documents('api::lesson-progress.lesson-progress')
              .create({
                data: {
                  student: studentId,
                  lesson: lessonDocumentId,
                  completedAt: new Date().toISOString(),
                  uniqueKey: key,
                } as never,
              })) as unknown as CompletedLesson;
          } catch (error) {
            record = (await strapi
              .documents('api::lesson-progress.lesson-progress')
              .findFirst({
                filters: { uniqueKey: key },
                fields: ['completedAt'],
              })) as unknown as CompletedLesson | null;
            if (!record) throw error;
            alreadyCompleted = true;
          }
        }

        return {
          lessonDocumentId,
          completedAt: record.completedAt,
          alreadyCompleted,
          progress: await progressForStudent(studentId, courseDocumentId),
        };
      },

      async forStudent(studentId: number, courseDocumentId: string) {
        return progressForStudent(studentId, courseDocumentId);
      },

      async assertLessonUnlocked(
        studentId: number,
        courseDocumentId: string,
        lessonDocumentId: string
      ) {
        const progress = await progressForStudent(studentId, courseDocumentId);
        const lesson = progress.steps.find(
          ({ kind, documentId }) =>
            kind === 'lesson' && documentId === lessonDocumentId
        );
        if (!lesson) throw new NotFoundError('Lesson not found in this course.');
        if (lesson.locked) {
          throw new ForbiddenError('Complete the previous course steps first.');
        }
        return lesson;
      },

      async assertQuizUnlocked(
        studentId: number,
        courseDocumentId: string,
        quizDocumentId: string
      ) {
        const progress = await progressForStudent(studentId, courseDocumentId);
        const quiz = progress.steps.find(
          ({ kind, documentId }) =>
            kind === 'quiz' && documentId === quizDocumentId
        );
        if (!quiz) throw new NotFoundError('Quiz not found in this course.');
        if (quiz.locked) {
          throw new ForbiddenError('Complete the previous course steps first.');
        }
        return quiz;
      },

      async forManagedCourse(courseDocumentId: string) {
        const enrollments = (await strapi
          .documents('api::enrollment.enrollment')
          .findMany({
            filters: { course: { documentId: courseDocumentId } },
            populate: {
              student: { fields: ['id', 'documentId', 'username', 'email'] },
            },
            sort: ['enrolledAt:asc'],
          })) as unknown as EnrollmentWithStudent[];

        return Promise.all(
          enrollments.flatMap((enrollment) =>
            enrollment.student
              ? [
                  (async () => ({
                    student: enrollment.student,
                    progress: await progressForStudent(
                      enrollment.student!.id,
                      courseDocumentId
                    ),
                  }))(),
                ]
              : []
          )
        );
      },
    };
  }
);
