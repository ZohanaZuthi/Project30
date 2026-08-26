export const ACCESS_COOKIE = "p30_access";
export const REFRESH_COOKIE = "p30_refresh";

export const APP_ROLES = {
  ADMIN: "admin",
  CONTENT_MANAGER: "content_manager",
  INSTRUCTOR: "instructor",
  STUDENT: "student",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const COURSE_MANAGER_ROLES: readonly AppRole[] = [
  APP_ROLES.ADMIN,
  APP_ROLES.CONTENT_MANAGER,
  APP_ROLES.INSTRUCTOR,
];
