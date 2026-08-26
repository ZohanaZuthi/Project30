import type { Context } from 'koa';

import type { ApplicationUser } from '../../../utils/authorization';

type EnrollmentService = {
  enroll(user: ApplicationUser, courseDocumentId: string): Promise<unknown>;
  findMine(user: ApplicationUser): Promise<unknown[]>;
  findMineOne(user: ApplicationUser, courseDocumentId: string): Promise<unknown>;
};

function service() {
  return strapi.service('api::enrollment.enrollment') as unknown as EnrollmentService;
}

export default {
  async enroll(ctx: Context) {
    ctx.status = 201;
    ctx.body = {
      data: await service().enroll(
        ctx.state.user as ApplicationUser,
        ctx.params.courseDocumentId
      ),
    };
  },

  async findMine(ctx: Context) {
    ctx.body = {
      data: await service().findMine(ctx.state.user as ApplicationUser),
    };
  },

  async findMineOne(ctx: Context) {
    ctx.body = {
      data: await service().findMineOne(
        ctx.state.user as ApplicationUser,
        ctx.params.courseDocumentId
      ),
    };
  },
};
