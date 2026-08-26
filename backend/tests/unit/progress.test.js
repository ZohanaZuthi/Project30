require('ts-node/register/transpile-only');

const { calculateProgress } = require('../../src/utils/progress');

describe('course progress calculation', () => {
  test.each([
    [5, 3, { totalLessons: 5, completedLessons: 3, percentage: 60 }],
    [0, 0, { totalLessons: 0, completedLessons: 0, percentage: 0 }],
    [3, 9, { totalLessons: 3, completedLessons: 3, percentage: 100 }],
    [4, -2, { totalLessons: 4, completedLessons: 0, percentage: 0 }],
  ])('normalizes %p total and %p completed', (total, completed, expected) => {
    expect(calculateProgress(total, completed)).toEqual(expected);
  });
});
