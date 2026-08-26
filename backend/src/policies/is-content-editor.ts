import type { Context } from 'koa';

import { isContentEditor, type ApplicationUser } from '../utils/authorization';

export default (policyContext: Context) =>
  isContentEditor(policyContext.state.user as ApplicationUser | undefined);
