import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { APP_ROLES, type AppRole } from '../../../utils/authorization';
import { acquirePostgresTransactionLock } from '../../../utils/database-lock';

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
const ADMIN_MUTATION_LOCK = 'lms:active-admin-membership';

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

  async function lockAdminMutations(trx: unknown) {
    await acquirePostgresTransactionLock(trx, ADMIN_MUTATION_LOCK);
  }

  async function assertAdminCanBeChanged(target: UserRecord) {
    if (target.role?.type !== APP_ROLES.ADMIN || target.blocked) return;

    const activeAdminCount = await users().count({
      where: {
        role: { type: APP_ROLES.ADMIN },
        blocked: false,
      },
    });

    if (activeAdminCount <= 1) {
      throw new ValidationError(
        'Cannot demote or block the last active Admin.'
      );
    }
  }

  return {
    async findUsers(page: number, pageSize: number) {
      const [records, total] = await Promise.all([
        users().findMany({
          populate: { role: true },
          orderBy: { createdAt: 'desc' },
          offset: (page - 1) * pageSize,
          limit: pageSize,
        }) as Promise<UserRecord[]>,
        users().count({}),
      ]);
      return {
        data: records.map(userDto),
        meta: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    },

    async updateRole(actorId: number, userDocumentId: string, roleType: AppRole | null) {
      const updated = await strapi.db.transaction(async ({ trx }) => {
        await lockAdminMutations(trx);
        const target = await findUser(userDocumentId);
        if (roleType !== APP_ROLES.ADMIN) {
          await assertAdminCanBeChanged(target);
        }

        const role = roleType
          ? ((await roles().findOne({ where: { type: roleType } })) as RoleRecord | null)
          : null;
        if (roleType && !role) {
          throw new ValidationError('Application role not found.');
        }

        return (await users().update({
          where: { id: target.id },
          data: { role: role?.id ?? null },
          populate: { role: true },
        })) as UserRecord;
      });
      strapi.log.info(
        `Admin user ${actorId} changed user ${updated.id} role to ${roleType ?? 'unassigned'}.`
      );
      return userDto(updated);
    },

    async updateStatus(actorId: number, userDocumentId: string, blocked: boolean) {
      const updated = await strapi.db.transaction(async ({ trx }) => {
        await lockAdminMutations(trx);
        const target = await findUser(userDocumentId);
        if (actorId === target.id && blocked) {
          throw new ForbiddenError('You cannot block your own account.');
        }
        if (blocked) await assertAdminCanBeChanged(target);

        return (await users().update({
          where: { id: target.id },
          data: { blocked },
          populate: { role: true },
        })) as UserRecord;
      });
      strapi.log.info(`Admin user ${actorId} set user ${updated.id} blocked=${blocked}.`);
      return userDto(updated);
    },

    async stats() {
      const [allRoles, totalUsers, totalCourses, totalLessons, totalEnrollments, totalQuizzes, totalAttempts, publishedPosts] =
        await Promise.all([
          roles().findMany({ where: { type: { $in: Object.values(APP_ROLES) } } }),
          users().count({}),
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
      const unassignedUsers = await users().count({ where: { role: null } });

      return {
        usersByRole: {
          ...Object.fromEntries(roleCounts),
          unassigned: unassignedUsers,
        },
        totalUsers,
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
