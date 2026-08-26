import type { Context } from 'koa';

import { getAuthenticatedUser } from '../../../utils/authorization';
import {
  parseBody,
  roleUpdateSchema,
  userStatusSchema,
} from '../../../utils/validation';

type PlatformService = {
  findUsers(): Promise<unknown>;
  updateRole(actorId: number, userDocumentId: string, role: string | null): Promise<unknown>;
  updateStatus(actorId: number, userDocumentId: string, blocked: boolean): Promise<unknown>;
  deleteUser(actorId: number, userDocumentId: string): Promise<unknown>;
  stats(): Promise<unknown>;
};

function service() {
  return strapi.service('api::platform.platform') as unknown as PlatformService;
}

export default {
  async findUsers(ctx: Context) {
    ctx.body = { data: await service().findUsers() };
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

  async deleteUser(ctx: Context) {
    const actor = getAuthenticatedUser(ctx);
    ctx.body = {
      data: await service().deleteUser(actor.id, ctx.params.userDocumentId),
    };
  },

  async stats(ctx: Context) {
    ctx.body = { data: await service().stats() };
  },
};
