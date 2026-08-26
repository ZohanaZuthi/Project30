import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { z } from 'zod';

import type {
  lessonCreateSchema,
  lessonUpdateSchema,
} from '../../../utils/validation';

type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

type LessonDocument = {
  documentId: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  position: number;
};

const { ValidationError } = errors;

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
      sort: ['position:asc'],
    });

    return (lessons as unknown as LessonDocument[]).map(lessonDto);
  },

  async createForCourse(courseDocumentId: string, input: LessonCreateInput) {
    const lesson = await strapi.documents('api::lesson.lesson').create({
      data: {
        ...input,
        course: courseDocumentId,
      } as never,
    });

    return lessonDto(lesson as unknown as LessonDocument);
  },

  async updateManaged(documentId: string, input: LessonUpdateInput) {
    const current = (await strapi.documents('api::lesson.lesson').findOne({
      documentId,
      fields: ['content', 'videoUrl'],
    })) as unknown as LessonDocument | null;
    const content = 'content' in input ? input.content : current?.content;
    const videoUrl = 'videoUrl' in input ? input.videoUrl : current?.videoUrl;

    if (!content && !videoUrl) {
      throw new ValidationError(
        'A lesson needs text content, a video URL, or both.'
      );
    }

    const data = {
      ...input,
      ...('videoUrl' in input ? { videoUrl: input.videoUrl ?? null } : {}),
    };
    const lesson = await strapi.documents('api::lesson.lesson').update({
      documentId,
      data: data as never,
    });

    return lessonDto(lesson as unknown as LessonDocument);
  },

  async deleteManaged(documentId: string) {
    await strapi.documents('api::lesson.lesson').delete({ documentId });
    return { documentId };
  },
}));
