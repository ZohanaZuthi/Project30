import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { APP_ROLES, type AppRole } from '../../../utils/authorization';

type RoleRecord = { id: number; name: string; type: string };
type UserRecord = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt?: string;
  role?: RoleRecord | null;
};

const { ForbiddenError, NotFoundError, ValidationError } = errors;

function userDto(user: UserRecord) {
  return {
    documentId: user.documentId,
    username: user.username,
    email: user.email,
    confirmed: user.confirmed,
    blocked: user.blocked,
    createdAt: user.createdAt,
    role: user.role
      ? { name: user.role.name, type: user.role.type }
      : null,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const users = () => strapi.db.query('plugin::users-permissions.user');
  const roles = () => strapi.db.query('plugin::users-permissions.role');

  async function findUser(documentId: string) {
    const user = (await users().findOne({
      where: { documentId },
      populate: { role: true },
    })) as UserRecord | null;
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  async function assertAdminCanBeChanged(target: UserRecord, nextRole?: string | null) {
    if (target.role?.type !== APP_ROLES.ADMIN || nextRole === APP_ROLES.ADMIN) return;
    const adminCount = await users().count({
      where: { role: { type: APP_ROLES.ADMIN } },
    });
    if (adminCount <= 1) {
      throw new ValidationError('The last admin account cannot be removed or demoted.');
    }
  }

  return {
    async findUsers() {
      const records = (await users().findMany({
        populate: { role: true },
        orderBy: { createdAt: 'desc' },
      })) as UserRecord[];
      return records.map(userDto);
    },

    async updateRole(actorId: number, userDocumentId: string, roleType: AppRole | null) {
      const target = await findUser(userDocumentId);
      await assertAdminCanBeChanged(target, roleType);

      const role = roleType
        ? ((await roles().findOne({ where: { type: roleType } })) as RoleRecord | null)
        : null;
      if (roleType && !role) throw new ValidationError('Application role not found.');

      const updated = (await users().update({
        where: { id: target.id },
        data: { role: role?.id ?? null },
        populate: { role: true },
      })) as UserRecord;
      strapi.log.info(`Admin user ${actorId} changed user ${target.id} role to ${roleType ?? 'none'}.`);
      return userDto(updated);
    },

    async updateStatus(actorId: number, userDocumentId: string, blocked: boolean) {
      const target = await findUser(userDocumentId);
      if (actorId === target.id && blocked) {
        throw new ForbiddenError('You cannot block your own account.');
      }
      if (blocked) await assertAdminCanBeChanged(target, null);

      const updated = (await users().update({
        where: { id: target.id },
        data: { blocked },
        populate: { role: true },
      })) as UserRecord;
      strapi.log.info(`Admin user ${actorId} set user ${target.id} blocked=${blocked}.`);
      return userDto(updated);
    },

    async deleteUser(actorId: number, userDocumentId: string) {
      const target = await findUser(userDocumentId);
      if (actorId === target.id) {
        throw new ForbiddenError('You cannot delete your own account.');
      }
      await assertAdminCanBeChanged(target, null);
      await users().delete({ where: { id: target.id } });
      strapi.log.info(`Admin user ${actorId} deleted user ${target.id}.`);
      return { documentId: userDocumentId };
    },

    async stats() {
      const [allRoles, totalCourses, totalLessons, totalEnrollments, totalQuizzes, totalAttempts, publishedPosts] =
        await Promise.all([
          roles().findMany({ where: { type: { $in: Object.values(APP_ROLES) } } }),
          strapi.documents('api::course.course').count({}),
          strapi.documents('api::lesson.lesson').count({}),
          strapi.documents('api::enrollment.enrollment').count({}),
          strapi.documents('api::quiz.quiz').count({}),
          strapi.documents('api::quiz-attempt.quiz-attempt').count({}),
          strapi.documents('api::blog-post.blog-post').count({ status: 'published' }),
        ]);
      const roleCounts = await Promise.all(
        (allRoles as RoleRecord[]).map(async (role) => [
          role.type,
          await users().count({ where: { role: { id: role.id } } }),
        ] as const)
      );

      return {
        usersByRole: Object.fromEntries(roleCounts),
        totalUsers: roleCounts.reduce((sum, [, count]) => sum + count, 0),
        totalCourses,
        totalLessons,
        totalEnrollments,
        totalQuizzes,
        totalQuizAttempts: totalAttempts,
        publishedBlogPosts: publishedPosts,
      };
    },
  };
};
