import type { Context } from 'koa';

import { getAuthenticatedUser } from '../../../utils/authorization';
import {
  blogCreateSchema,
  blogUpdateSchema,
  parseBody,
} from '../../../utils/validation';

type BlogService = {
  findPublished(): Promise<unknown>;
  findPublishedOne(slug: string): Promise<unknown>;
  findManaged(user: unknown): Promise<unknown>;
  findManagedOne(documentId: string): Promise<unknown>;
  createManaged(user: unknown, input: unknown): Promise<unknown>;
  updateManaged(documentId: string, input: unknown): Promise<unknown>;
  deleteManaged(documentId: string): Promise<unknown>;
};

function service() {
  return strapi.service('api::blog-post.blog-post') as unknown as BlogService;
}

export default {
  async findPublished(ctx: Context) {
    ctx.body = { data: await service().findPublished() };
  },

  async findPublishedOne(ctx: Context) {
    ctx.body = { data: await service().findPublishedOne(ctx.params.slug) };
  },

  async findManaged(ctx: Context) {
    ctx.body = { data: await service().findManaged(getAuthenticatedUser(ctx)) };
  },

  async findManagedOne(ctx: Context) {
    ctx.body = { data: await service().findManagedOne(ctx.params.blogDocumentId) };
  },

  async createManaged(ctx: Context) {
    const input = parseBody(blogCreateSchema, ctx.request.body);
    ctx.status = 201;
    ctx.body = {
      data: await service().createManaged(getAuthenticatedUser(ctx), input),
    };
  },

  async updateManaged(ctx: Context) {
    const input = parseBody(blogUpdateSchema, ctx.request.body);
    ctx.body = {
      data: await service().updateManaged(ctx.params.blogDocumentId, input),
    };
  },

  async deleteManaged(ctx: Context) {
    ctx.body = {
      data: await service().deleteManaged(ctx.params.blogDocumentId),
    };
  },
};
