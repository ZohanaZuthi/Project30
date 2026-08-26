require('ts-node/register/transpile-only');

const { enrollmentKey, lessonProgressKey } = require('../../src/utils/unique-key');

describe('idempotency keys', () => {
  test('scope enrollment to one student and one course', () => {
    expect(enrollmentKey(7, 'course-a')).toBe('student:7:course:course-a');
    expect(enrollmentKey(8, 'course-a')).not.toBe(enrollmentKey(7, 'course-a'));
  });

  test('scope completion to one student and one lesson', () => {
    expect(lessonProgressKey(7, 'lesson-a')).toBe('student:7:lesson:lesson-a');
  });
});
