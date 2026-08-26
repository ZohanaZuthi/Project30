import type { Context } from 'koa';

import { toSafeUser, type ApplicationUser } from '../../../utils/authorization';

export default {
  me(ctx: Context) {
    const user = ctx.state.user as ApplicationUser | undefined;

    if (!user) {
      return ctx.unauthorized('Authentication required.');
    }

    ctx.body = { data: toSafeUser(user) };
  },
};
