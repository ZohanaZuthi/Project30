import { describe, expect, it } from 'vitest';

import {
  APP_ROLES,
  canCreateCourses,
  canManageCourse,
  canManageEveryCourse,
  type ApplicationUser,
} from './authorization';

function user(id: number, type: string): ApplicationUser {
  return { id, role: { type } };
}

describe('course authorization', () => {
  const admin = user(1, APP_ROLES.ADMIN);
  const manager = user(2, APP_ROLES.CONTENT_MANAGER);
  const instructorA = user(3, APP_ROLES.INSTRUCTOR);
  const instructorB = user(4, APP_ROLES.INSTRUCTOR);
  const student = user(5, APP_ROLES.STUDENT);

  it('allows only staff roles to create courses', () => {
    expect(canCreateCourses(admin)).toBe(true);
    expect(canCreateCourses(manager)).toBe(true);
    expect(canCreateCourses(instructorA)).toBe(true);
    expect(canCreateCourses(student)).toBe(false);
  });

  it('allows admin and content manager to manage every course', () => {
    expect(canManageEveryCourse(admin)).toBe(true);
    expect(canManageEveryCourse(manager)).toBe(true);
    expect(canManageCourse(admin, { id: instructorA.id })).toBe(true);
    expect(canManageCourse(manager, { id: instructorA.id })).toBe(true);
  });

  it('allows an instructor to manage only their own course', () => {
    expect(canManageCourse(instructorA, { id: instructorA.id })).toBe(true);
    expect(canManageCourse(instructorA, { id: instructorB.id })).toBe(false);
  });

  it('never allows students or anonymous callers to manage courses', () => {
    expect(canManageCourse(student, { id: instructorA.id })).toBe(false);
    expect(canManageCourse(null, { id: instructorA.id })).toBe(false);
  });
});

