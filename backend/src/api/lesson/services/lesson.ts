import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { z } from 'zod';

import type {
  lessonCreateSchema,
  lessonUpdateSchema,
} from '../../../utils/validation';
import { acquirePostgresTransactionLock } from '../../../utils/database-lock';

type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

type LessonDocument = {
  documentId: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  position: number;
  course?: { documentId: string } | null;
};

type LessonProgressService = {
  assertLessonUnlocked(
    studentId: number,
    courseDocumentId: string,
    lessonDocumentId: string
  ): Promise<unknown>;
};

const { NotFoundError, ValidationError } = errors;

const courseStepOrderLock = (courseDocumentId: string) =>
  `lms:course-step-order:${courseDocumentId}`;

function lessonDto(lesson: LessonDocument) {
  return {
    documentId: lesson.documentId,
    title: lesson.title,
    content: lesson.content ?? '',
    videoUrl: lesson.videoUrl ?? null,
    position: lesson.position,
  };
}

export default factories.createCoreService('api::lesson.lesson', ({ strapi }) => ({
  async findForCourse(courseDocumentId: string) {
    const lessons = await strapi.documents('api::lesson.lesson').findMany({
      filters: { course: { documentId: courseDocumentId } },
      fields: ['title', 'content', 'videoUrl', 'position'],
      sort: ['position:asc', 'createdAt:asc'],
    });

    return (lessons as unknown as LessonDocument[]).map(lessonDto);
  },

  async createForCourse(courseDocumentId: string, input: LessonCreateInput) {
    const lesson = await strapi.db.transaction(async ({ trx }) => {
      await acquirePostgresTransactionLock(trx, courseStepOrderLock(courseDocumentId));
      const lessonConflict = await strapi.db.query('api::lesson.lesson').findOne({
        where: { course: { documentId: courseDocumentId }, position: input.position },
        select: ['id'],
      });
      const quizConflict = await strapi.db.query('api::quiz.quiz').findOne({
        where: { course: { documentId: courseDocumentId }, position: input.position },
        select: ['id'],
      });
      if (lessonConflict || quizConflict) {
        throw new ValidationError(
          `Course step position ${input.position} is already used in this course.`
        );
      }

      return strapi.documents('api::lesson.lesson').create({
        data: {
          ...input,
          course: courseDocumentId,
        } as never,
      });
    });

    return lessonDto(lesson as unknown as LessonDocument);
  },

  async updateManaged(documentId: string, input: LessonUpdateInput) {
    const lesson = await strapi.db.transaction(async ({ trx }) => {
      const current = (await strapi.db.query('api::lesson.lesson').findOne({
        where: { documentId },
        select: ['documentId', 'content', 'videoUrl', 'position'],
        populate: { course: { select: ['documentId'] } },
      })) as LessonDocument | null;
      if (!current?.course) throw new NotFoundError('Lesson not found.');

      await acquirePostgresTransactionLock(
        trx,
        courseStepOrderLock(current.course.documentId)
      );
      const content = 'content' in input ? input.content : current.content;
      const videoUrl = 'videoUrl' in input ? input.videoUrl : current.videoUrl;

      if (!content && !videoUrl) {
        throw new ValidationError(
          'A lesson needs text content, a video URL, or both.'
        );
      }

      if (input.position !== undefined && input.position !== current.position) {
        const lessonConflict = await strapi.db.query('api::lesson.lesson').findOne({
          where: {
            course: { documentId: current.course.documentId },
            position: input.position,
          },
          select: ['documentId'],
        });
        const quizConflict = await strapi.db.query('api::quiz.quiz').findOne({
          where: {
            course: { documentId: current.course.documentId },
            position: input.position,
          },
          select: ['documentId'],
        });
        if (
          (lessonConflict && lessonConflict.documentId !== documentId) ||
          quizConflict
        ) {
          throw new ValidationError(
            `Course step position ${input.position} is already used in this course.`
          );
        }
      }

      const data = {
        ...input,
        ...('videoUrl' in input ? { videoUrl: input.videoUrl ?? null } : {}),
      };
      return strapi.documents('api::lesson.lesson').update({
        documentId,
        data: data as never,
      });
    });

    return lessonDto(lesson as unknown as LessonDocument);
  },

  async deleteManaged(documentId: string) {
    await strapi.db.transaction(async ({ trx }) => {
      const lesson = (await strapi.db.query('api::lesson.lesson').findOne({
        where: { documentId },
        select: ['documentId'],
        populate: { course: { select: ['documentId'] } },
      })) as LessonDocument | null;
      if (!lesson?.course) throw new NotFoundError('Lesson not found.');
      await acquirePostgresTransactionLock(
        trx,
        courseStepOrderLock(lesson.course.documentId)
      );
      await strapi.db
        .query('api::lesson-progress.lesson-progress')
        .deleteMany({ where: { lesson: { documentId } } });
      await strapi.documents('api::lesson.lesson').delete({ documentId });
    });
    return { documentId };
  },

  async findForStudent(
    studentId: number,
    courseDocumentId: string,
    lessonDocumentId: string
  ) {
    const progress = strapi.service(
      'api::lesson-progress.lesson-progress'
    ) as unknown as LessonProgressService;
    await progress.assertLessonUnlocked(
      studentId,
      courseDocumentId,
      lessonDocumentId
    );

    const lesson = (await strapi.db.query('api::lesson.lesson').findOne({
      where: {
        documentId: lessonDocumentId,
        course: { documentId: courseDocumentId },
      },
      select: ['documentId', 'title', 'content', 'videoUrl', 'position'],
    })) as LessonDocument | null;

    if (!lesson) {
      throw new NotFoundError('Lesson not found in this course.');
    }

    return lessonDto(lesson);
  },
}));
