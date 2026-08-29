import type { Context } from 'koa';

import { getAuthenticatedUser } from '../../../utils/authorization';
import {
  parseBody,
  paginationSchema,
  roleUpdateSchema,
  userStatusSchema,
} from '../../../utils/validation';

type PlatformService = {
  findUsers(page: number, pageSize: number): Promise<unknown>;
  updateRole(actorId: number, userDocumentId: string, role: string | null): Promise<unknown>;
  updateStatus(actorId: number, userDocumentId: string, blocked: boolean): Promise<unknown>;
  stats(): Promise<unknown>;
};

function service() {
  return strapi.service('api::platform.platform') as unknown as PlatformService;
}

export default {
  async findUsers(ctx: Context) {
    const { page, pageSize } = parseBody(paginationSchema, ctx.query);
    ctx.body = await service().findUsers(page, pageSize);
  },

  async updateRole(ctx: Context) {
    const actor = getAuthenticatedUser(ctx);
    const { role } = parseBody(roleUpdateSchema, ctx.request.body);
    ctx.body = {
      data: await service().updateRole(actor.id, ctx.params.userDocumentId, role),
    };
  },

  async updateStatus(ctx: Context) {
    const actor = getAuthenticatedUser(ctx);
    const { blocked } = parseBody(userStatusSchema, ctx.request.body);
    ctx.body = {
      data: await service().updateStatus(
        actor.id,
        ctx.params.userDocumentId,
        blocked
      ),
    };
  },

  async stats(ctx: Context) {
    ctx.body = { data: await service().stats() };
  },
};
