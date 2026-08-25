import type { Context } from 'koa';

export default {
  check(ctx: Context) {
    ctx.body = {
      service: 'project30-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  },
};
