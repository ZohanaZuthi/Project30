import type { Context } from 'koa';

import { getAuthenticatedUser } from '../../../utils/authorization';

type ProgressService = {
  complete(userId: number, courseDocumentId: string, lessonDocumentId: string): Promise<unknown>;
  forStudent(userId: number, courseDocumentId: string): Promise<unknown>;
  forManagedCourse(courseDocumentId: string): Promise<unknown>;
};

function service() {
  return strapi.service(
    'api::lesson-progress.lesson-progress'
  ) as unknown as ProgressService;
}

export default {
  async complete(ctx: Context) {
    const user = getAuthenticatedUser(ctx);
    ctx.body = {
      data: await service().complete(
        user.id,
        ctx.params.courseDocumentId,
        ctx.params.lessonDocumentId
      ),
    };
  },

  async mine(ctx: Context) {
    const user = getAuthenticatedUser(ctx);
    ctx.body = {
      data: await service().forStudent(user.id, ctx.params.courseDocumentId),
    };
  },

  async forManagedCourse(ctx: Context) {
    ctx.body = {
      data: await service().forManagedCourse(ctx.params.courseDocumentId),
    };
  },
};
