import type { Context } from 'koa';

import {
  lessonCreateSchema,
  lessonUpdateSchema,
  parseBody,
} from '../../../utils/validation';

type LessonService = {
  findForCourse(courseDocumentId: string): Promise<unknown[]>;
  createForCourse(courseDocumentId: string, input: unknown): Promise<unknown>;
  updateManaged(documentId: string, input: unknown): Promise<unknown>;
  deleteManaged(documentId: string): Promise<unknown>;
  findForStudent(courseDocumentId: string, lessonDocumentId: string): Promise<unknown>;
};

function service() {
  return strapi.service('api::lesson.lesson') as unknown as LessonService;
}

export default {
  async findForManagedCourse(ctx: Context) {
    ctx.body = {
      data: await service().findForCourse(ctx.params.courseDocumentId),
    };
  },

  async createForManagedCourse(ctx: Context) {
    const input = parseBody(lessonCreateSchema, ctx.request.body);
    ctx.status = 201;
    ctx.body = {
      data: await service().createForCourse(
        ctx.params.courseDocumentId,
        input
      ),
    };
  },

  async updateManaged(ctx: Context) {
    const input = parseBody(lessonUpdateSchema, ctx.request.body);
    ctx.body = {
      data: await service().updateManaged(ctx.params.lessonDocumentId, input),
    };
  },

  async deleteManaged(ctx: Context) {
    ctx.body = {
      data: await service().deleteManaged(ctx.params.lessonDocumentId),
    };
  },

  async findForStudent(ctx: Context) {
    ctx.body = {
      data: await service().findForStudent(
        ctx.params.courseDocumentId,
        ctx.params.lessonDocumentId
      ),
    };
  },
};
