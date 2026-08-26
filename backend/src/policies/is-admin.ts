import type { Context } from 'koa';

import { isAdmin, type ApplicationUser } from '../utils/authorization';

export default (policyContext: Context) =>
  isAdmin(policyContext.state.user as ApplicationUser | undefined);
