require('ts-node/register/transpile-only');

const { gradeQuiz } = require('../../src/utils/quiz-grading');

const questions = [
  { options: ['A', 'B'], correctOption: 1 },
  { options: ['A', 'B', 'C'], correctOption: 0 },
  { options: ['A', 'B'], correctOption: 0 },
];

describe('server-side quiz grading', () => {
  test('grades correct, incorrect, and missing answers', () => {
    expect(gradeQuiz(questions, [1, 2])).toEqual({
      answers: [1, 2, null],
      score: 1,
      total: 3,
      percentage: 33,
    });
  });

  test('normalizes out-of-range answers instead of trusting them', () => {
    expect(gradeQuiz(questions, [8, -1, 0])).toMatchObject({
      answers: [null, null, 0],
      score: 1,
    });
  });

  test('handles an empty quiz defensively', () => {
    expect(gradeQuiz([], [])).toMatchObject({ score: 0, total: 0, percentage: 0 });
  });
});
