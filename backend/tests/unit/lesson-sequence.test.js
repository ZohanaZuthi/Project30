const {
  addLearningStepLocks,
  addLessonLocks,
  learningStepKey,
} = require('../../src/utils/lesson-sequence');

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

  test('a quiz can be an ordered step between general lessons', () => {
    const steps = [
      { ...lessons[0], kind: 'lesson' },
      { documentId: 'quiz-1', title: 'Check learning', position: 2, kind: 'quiz' },
      { ...lessons[2], kind: 'lesson' },
    ];
    const completed = new Set([learningStepKey('lesson', 'lesson-1')]);

    expect(
      addLearningStepLocks(steps, completed).map(({ locked }) => locked)
    ).toEqual([false, false, true]);
    expect(
      addLearningStepLocks(
        steps,
        new Set([
          learningStepKey('lesson', 'lesson-1'),
          learningStepKey('quiz', 'quiz-1'),
        ])
      ).map(({ locked }) => locked)
    ).toEqual([false, false, false]);
  });
});
