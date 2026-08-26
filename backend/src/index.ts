import type { Core } from '@strapi/strapi';

import { APP_ROLES } from './utils/authorization';

type RoleRecord = {
  id: number;
  name: string;
  type: string;
};
const ROLE_SEEDS = [
  {
    name: 'Student',
    type: APP_ROLES.STUDENT,
    description: 'Enrolls in courses and completes learning activities.',
  },
  {
    name: 'Instructor',
    type: APP_ROLES.INSTRUCTOR,
    description: 'Manages owned courses, lessons, quizzes, and student progress.',
  },
  {
    name: 'Content Manager',
    type: APP_ROLES.CONTENT_MANAGER,
    description: 'Manages the platform content library and authored blog posts.',
  },
  {
    name: 'Admin',
    type: APP_ROLES.ADMIN,
    description: 'Has full LMS application access, including role management.',
  },
] as const;

const COURSE_MANAGEMENT_ACTIONS = [
  'api::course.course.findManaged',
  'api::course.course.findManagedOne',
  'api::course.course.createManaged',
  'api::course.course.updateManaged',
  'api::course.course.deleteManaged',
  'api::lesson.lesson.findForManagedCourse',
  'api::lesson.lesson.createForManagedCourse',
  'api::lesson.lesson.updateManaged',
  'api::lesson.lesson.deleteManaged',
  'api::quiz.quiz.findForManagedCourse',
  'api::quiz.quiz.createForManagedCourse',
  'api::quiz.quiz.updateManaged',
  'api::quiz.quiz.deleteManaged',
  'api::lesson-progress.lesson-progress.forManagedCourse',
] as const;

const BLOG_MANAGEMENT_ACTIONS = [
  'api::blog-post.blog-post.findManaged',
  'api::blog-post.blog-post.findManagedOne',
  'api::blog-post.blog-post.createManaged',
  'api::blog-post.blog-post.updateManaged',
  'api::blog-post.blog-post.deleteManaged',
] as const;

const PERMISSIONS_BY_ROLE: Record<string, readonly string[]> = {
  [APP_ROLES.STUDENT]: [
    'api::account.account.me',
    'api::enrollment.enrollment.enroll',
    'api::enrollment.enrollment.findMine',
    'api::enrollment.enrollment.findMineOne',
    'api::lesson.lesson.findForStudent',
    'api::lesson-progress.lesson-progress.complete',
    'api::lesson-progress.lesson-progress.mine',
    'api::quiz.quiz.findForStudent',
    'api::quiz.quiz.findOneForStudent',
    'api::quiz.quiz.submit',
    'api::quiz-attempt.quiz-attempt.mine',
  ],
  [APP_ROLES.INSTRUCTOR]: [
    'api::account.account.me',
    ...COURSE_MANAGEMENT_ACTIONS,
  ],
  [APP_ROLES.CONTENT_MANAGER]: [
    'api::account.account.me',
    ...COURSE_MANAGEMENT_ACTIONS,
    ...BLOG_MANAGEMENT_ACTIONS,
  ],
  [APP_ROLES.ADMIN]: [
    'api::account.account.me',
    ...COURSE_MANAGEMENT_ACTIONS,
    ...BLOG_MANAGEMENT_ACTIONS,
    'api::platform.platform.findUsers',
    'api::platform.platform.updateRole',
    'api::platform.platform.updateStatus',
    'api::platform.platform.deleteUser',
    'api::platform.platform.stats',
  ],
};

async function ensureApplicationRoles(strapi: Core.Strapi) {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const roles = new Map<string, RoleRecord>();

  for (const seed of ROLE_SEEDS) {
    const existing = (await roleQuery.findOne({
      where: { type: seed.type },
    })) as RoleRecord | null;

    const role =
      existing ??
      ((await roleQuery.create({
        data: seed,
      })) as RoleRecord);

    roles.set(seed.type, role);
  }

  return roles;
}

async function makeStudentTheRegistrationDefault(strapi: Core.Strapi) {
  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'users-permissions',
  });
  const advanced = ((await pluginStore.get({ key: 'advanced' })) ?? {}) as Record<
    string,
    unknown
  >;

  await pluginStore.set({
    key: 'advanced',
    value: {
      ...advanced,
      allow_register: true,
      unique_email: true,
      default_role: APP_ROLES.STUDENT,
    },
  });
}

async function ensureApplicationPermissions(
  strapi: Core.Strapi,
  roles: Map<string, RoleRecord>
) {
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');

  for (const [roleType, actions] of Object.entries(PERMISSIONS_BY_ROLE)) {
    const role = roles.get(roleType);
    if (!role) continue;
    for (const action of actions) {
      const existing = await permissionQuery.findOne({
        where: { role: { id: role.id }, action },
      });
      if (!existing) {
        await permissionQuery.create({ data: { role: role.id, action } });
      }
    }
  }
}

async function migrateLegacyAuthenticatedUsers(
  strapi: Core.Strapi,
  roles: Map<string, RoleRecord>
) {
  const legacyRole = (await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } })) as RoleRecord | null;
  const studentRole = roles.get(APP_ROLES.STUDENT);

  if (!legacyRole || !studentRole) return;

  const legacyUsers = (await strapi.db
    .query('plugin::users-permissions.user')
    .findMany({ where: { role: { id: legacyRole.id } }, select: ['id'] })) as Array<{
    id: number;
  }>;

  await Promise.all(
    legacyUsers.map(({ id }) =>
      strapi.db.query('plugin::users-permissions.user').update({
        where: { id },
        data: { role: studentRole.id },
      })
    )
  );

  if (legacyUsers.length > 0) {
    strapi.log.info(
      `Migrated ${legacyUsers.length} legacy Authenticated user(s) to Student.`
    );
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const roles = await ensureApplicationRoles(strapi);
    await ensureApplicationPermissions(strapi, roles);
    await makeStudentTheRegistrationDefault(strapi);
    await migrateLegacyAuthenticatedUsers(strapi, roles);

    strapi.log.info('LMS application roles and Student registration default are ready.');
  },
};
