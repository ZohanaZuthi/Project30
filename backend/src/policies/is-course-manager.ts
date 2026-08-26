import type { Context } from 'koa';

import { canCreateCourses, type ApplicationUser } from '../utils/authorization';

export default (policyContext: Context) => {
  return canCreateCourses(policyContext.state.user as ApplicationUser | undefined);
};

