import type { Context } from 'koa';

import { toSafeUser, type ApplicationUser } from '../../../utils/authorization';

type JwtService = {
  getToken(ctx: Context): Promise<{ id?: number | string } | null>;
};

type SessionManager = {
  validateRefreshToken(token: string): Promise<{
    isValid: boolean;
    userId?: string;
    sessionId?: string;
  }>;
  revokeSessionById(userId: string, sessionId: string): Promise<boolean>;
};

export default {
  async me(ctx: Context) {
    try {
      const jwt = strapi
        .plugin('users-permissions')
        .service('jwt') as unknown as JwtService;
      const token = await jwt.getToken(ctx);
      if (!token?.id) return ctx.unauthorized('Authentication required.');
      const userId = Number(token.id);
      if (!Number.isInteger(userId)) {
        return ctx.unauthorized('Authentication required.');
      }

      const user = (await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({
          where: { id: userId },
          populate: { role: true },
        })) as (ApplicationUser & { blocked?: boolean; confirmed?: boolean }) | null;

      const advanced = (await strapi
        .store({ type: 'plugin', name: 'users-permissions' })
        .get({ key: 'advanced' })) as { email_confirmation?: boolean } | null;

      if (
        !user ||
        user.blocked ||
        (advanced?.email_confirmation && !user.confirmed)
      ) {
        return ctx.unauthorized('Authentication required.');
      }

      ctx.body = { data: toSafeUser(user) };
    } catch {
      return ctx.unauthorized('Authentication required.');
    }
  },

  async logout(ctx: Context) {
    const refreshToken = (ctx.request.body as { refreshToken?: unknown } | null)
      ?.refreshToken;

    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      try {
        const sessions = strapi.sessionManager(
          'users-permissions'
        ) as unknown as SessionManager;
        const validation = await sessions.validateRefreshToken(refreshToken);

        if (validation.isValid && validation.userId && validation.sessionId) {
          await sessions.revokeSessionById(validation.userId, validation.sessionId);
        }
      } catch {
        // Invalid, expired, and malformed tokens deliberately have one response.
      }
    }

    // Logout is intentionally idempotent and does not reveal token validity.
    ctx.body = { data: { ok: true } };
  },
};
