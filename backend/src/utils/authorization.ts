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

export function toSafeUser(user: ApplicationUser) {
  return {
    id: user.id,
    documentId: user.documentId,
    username: user.username ?? '',
    email: user.email ?? '',
    role: {
      name: user.role?.name ?? 'Unassigned',
      type: user.role?.type ?? 'unassigned',
    },
  };
}

