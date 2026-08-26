import type { Context } from 'koa';

import type { ApplicationUser } from '../../../utils/authorization';
import {
  courseCreateSchema,
  courseUpdateSchema,
  parseBody,
} from '../../../utils/validation';

type CourseService = {
  findPublished(): Promise<unknown[]>;
  findPublishedOne(documentId: string): Promise<unknown | null>;
  findManaged(user: ApplicationUser): Promise<unknown[]>;
  findManagedOne(documentId: string): Promise<unknown | null>;
  createManaged(user: ApplicationUser, input: unknown): Promise<unknown>;
  updateManaged(documentId: string, input: unknown): Promise<unknown>;
  deleteManaged(documentId: string): Promise<unknown>;
};

function service() {
  return strapi.service('api::course.course') as unknown as CourseService;
}

export default {
  async findPublished(ctx: Context) {
    ctx.body = { data: await service().findPublished() };
  },

  async findPublishedOne(ctx: Context) {
    const course = await service().findPublishedOne(ctx.params.courseDocumentId);
    if (!course) return ctx.notFound('Course not found.');
    ctx.body = { data: course };
  },

  async findManaged(ctx: Context) {
    ctx.body = {
      data: await service().findManaged(ctx.state.user as ApplicationUser),
    };
  },

  async findManagedOne(ctx: Context) {
    const course = await service().findManagedOne(ctx.params.courseDocumentId);
    if (!course) return ctx.notFound('Course not found.');
    ctx.body = { data: course };
  },

  async createManaged(ctx: Context) {
    const input = parseBody(courseCreateSchema, ctx.request.body);
    ctx.status = 201;
    ctx.body = {
      data: await service().createManaged(
        ctx.state.user as ApplicationUser,
        input
      ),
    };
  },

  async updateManaged(ctx: Context) {
    const input = parseBody(courseUpdateSchema, ctx.request.body);
    ctx.body = {
      data: await service().updateManaged(ctx.params.courseDocumentId, input),
    };
  },

  async deleteManaged(ctx: Context) {
    ctx.body = {
      data: await service().deleteManaged(ctx.params.courseDocumentId),
    };
  },
};
