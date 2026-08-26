import type { Context } from 'koa';

import { getAuthenticatedUser } from '../../../utils/authorization';

export default {
  async mine(ctx: Context) {
    const user = getAuthenticatedUser(ctx);
    ctx.body = {
      data: await strapi
        .service('api::quiz-attempt.quiz-attempt')
        .findMine(user.id),
    };
  },
};
