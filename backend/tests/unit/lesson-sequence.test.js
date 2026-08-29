const { addLessonLocks } = require('../../src/utils/lesson-sequence');

const lessons = [
  { documentId: 'lesson-1', title: 'One', position: 1 },
  { documentId: 'lesson-2', title: 'Two', position: 2 },
  { documentId: 'lesson-3', title: 'Three', position: 3 },
];

describe('lesson sequencing', () => {
  test('the first lesson is unlocked and every later lesson starts locked', () => {
    expect(addLessonLocks(lessons, new Set()).map(({ locked }) => locked)).toEqual([
      false,
      true,
      true,
    ]);
  });

  test('a lesson unlocks only when every preceding lesson is complete', () => {
    expect(
      addLessonLocks(lessons, new Set(['lesson-1'])).map(({ locked }) => locked)
    ).toEqual([false, false, true]);
    expect(
      addLessonLocks(lessons, new Set(['lesson-2'])).map(({ locked }) => locked)
    ).toEqual([false, true, true]);
  });
});
