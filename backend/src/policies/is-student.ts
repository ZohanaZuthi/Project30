import type { Context } from 'koa';

import { isStudent, type ApplicationUser } from '../utils/authorization';

export default (policyContext: Context) =>
  isStudent(policyContext.state.user as ApplicationUser | undefined);
