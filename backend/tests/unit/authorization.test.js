require('ts-node/register/transpile-only');

const {
  APP_ROLES,
  canCreateCourses,
  canManageBlogPost,
  canManageCourse,
  canManageEveryCourse,
  isAdmin,
  isContentEditor,
  isStudent,
} = require('../../src/utils/authorization');

const user = (id, type) => ({ id, role: { type } });

describe('role authorization', () => {
  const admin = user(1, APP_ROLES.ADMIN);
  const manager = user(2, APP_ROLES.CONTENT_MANAGER);
  const instructorA = user(3, APP_ROLES.INSTRUCTOR);
  const instructorB = user(4, APP_ROLES.INSTRUCTOR);
  const student = user(5, APP_ROLES.STUDENT);

  test('only staff can create courses', () => {
    expect(canCreateCourses(admin)).toBe(true);
    expect(canCreateCourses(manager)).toBe(true);
    expect(canCreateCourses(instructorA)).toBe(true);
    expect(canCreateCourses(student)).toBe(false);
  });

  test('admin and content manager can manage every course', () => {
    expect(canManageEveryCourse(admin)).toBe(true);
    expect(canManageEveryCourse(manager)).toBe(true);
  });

  test('an instructor can manage only an owned course', () => {
    expect(canManageCourse(instructorA, { id: instructorA.id })).toBe(true);
    expect(canManageCourse(instructorA, { id: instructorB.id })).toBe(false);
    expect(canManageCourse(student, { id: instructorA.id })).toBe(false);
  });

  test('blog permissions match the matrix', () => {
    expect(canManageBlogPost(admin, { id: manager.id })).toBe(true);
    expect(canManageBlogPost(manager, { id: manager.id })).toBe(true);
    expect(canManageBlogPost(manager, { id: admin.id })).toBe(false);
    expect(canManageBlogPost(instructorA, { id: instructorA.id })).toBe(false);
  });

  test('role predicates reject anonymous and wrong-role users', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isContentEditor(manager)).toBe(true);
    expect(isStudent(student)).toBe(true);
    expect(isStudent(undefined)).toBe(false);
  });
});
