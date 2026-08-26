import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { calculateProgress } from '../../../utils/progress';
import { lessonProgressKey } from '../../../utils/unique-key';

const { NotFoundError } = errors;

type LessonSummary = { documentId: string; title: string; position: number };
type CompletedLesson = {
  documentId: string;
  completedAt: string;
  lesson?: LessonSummary | null;
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
        orderBy: { position: 'asc' },
      })) as unknown as LessonSummary[];
    }

    async function progressForStudent(studentId: number, courseDocumentId: string) {
      const lessons = await lessonsForCourse(courseDocumentId);
      const lessonIds = lessons.map(({ documentId }) => documentId);
      const records = lessonIds.length
        ? ((await strapi.documents('api::lesson-progress.lesson-progress').findMany({
            filters: {
              student: { id: studentId },
              lesson: { documentId: { $in: lessonIds } },
            },
            fields: ['completedAt'],
            populate: { lesson: { fields: ['documentId', 'title', 'position'] } },
          })) as unknown as CompletedLesson[])
        : [];

      const completedIds = new Set(
        records.flatMap((record) =>
          record.lesson ? [record.lesson.documentId] : []
        )
      );
      const summary = calculateProgress(lessons.length, completedIds.size);

      return {
        ...summary,
        lessons: lessons.map((lesson) => ({
          ...lesson,
          completed: completedIds.has(lesson.documentId),
          completedAt:
            records.find(
              (record) => record.lesson?.documentId === lesson.documentId
            )?.completedAt ?? null,
        })),
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
