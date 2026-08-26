import { errors } from '@strapi/utils';

const { UnauthorizedError } = errors;

export const APP_ROLES = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content_manager',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export type ApplicationUser = {
  id: number;
  documentId?: string;
  username?: string;
  email?: string;
  role?: {
    id?: number;
    name?: string;
    type?: string;
  } | null;
};

export type CourseOwner = {
  id?: number;
} | null;

export function getAuthenticatedUser(context: {
  state: { user?: ApplicationUser };
}) {
  const user = context.state.user;
  if (!user) {
    throw new UnauthorizedError('Authentication required.');
  }
  return user;
}

export function getRoleType(user: ApplicationUser | null | undefined) {
  return user?.role?.type;
}

export function hasRole(
  user: ApplicationUser | null | undefined,
  allowedRoles: readonly AppRole[]
) {
  const role = getRoleType(user);
  return role !== undefined && allowedRoles.includes(role as AppRole);
}

export function canCreateCourses(user: ApplicationUser | null | undefined) {
  return hasRole(user, [
    APP_ROLES.ADMIN,
    APP_ROLES.CONTENT_MANAGER,
    APP_ROLES.INSTRUCTOR,
  ]);
}

export function canManageEveryCourse(user: ApplicationUser | null | undefined) {
  return hasRole(user, [APP_ROLES.ADMIN, APP_ROLES.CONTENT_MANAGER]);
}

export function canManageCourse(
  user: ApplicationUser | null | undefined,
  instructor: CourseOwner
) {
  if (!user) return false;
  if (canManageEveryCourse(user)) return true;

  return (
    getRoleType(user) === APP_ROLES.INSTRUCTOR &&
    instructor?.id !== undefined &&
    instructor.id === user.id
  );
}

export function isStudent(user: ApplicationUser | null | undefined) {
  return hasRole(user, [APP_ROLES.STUDENT]);
}

export function isAdmin(user: ApplicationUser | null | undefined) {
  return hasRole(user, [APP_ROLES.ADMIN]);
}

export function isContentEditor(user: ApplicationUser | null | undefined) {
  return hasRole(user, [APP_ROLES.ADMIN, APP_ROLES.CONTENT_MANAGER]);
}

export function canManageBlogPost(
  user: ApplicationUser | null | undefined,
  author: { id?: number } | null | undefined
) {
  if (!user) return false;
  if (isAdmin(user)) return true;

  return (
    getRoleType(user) === APP_ROLES.CONTENT_MANAGER &&
    author?.id !== undefined &&
    author.id === user.id
  );
}

export function canViewCourseProgress(
  user: ApplicationUser | null | undefined,
  instructor: CourseOwner
) {
  return canManageCourse(user, instructor);
}

export function toSafeUser(user: ApplicationUser) {
  return {
    id: user.id,
    documentId: user.documentId,
    username: user.username ?? '',
    email: user.email ?? '',
    role: user.role
      ? {
          name: user.role.name ?? 'Unassigned',
          type: user.role.type ?? 'unassigned',
        }
      : null,
  };
}
