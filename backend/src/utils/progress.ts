export function calculateProgress(totalLessons: number, completedLessons: number) {
  const safeTotal = Math.max(0, totalLessons);
  const safeCompleted = Math.min(Math.max(0, completedLessons), safeTotal);

  return {
    totalLessons: safeTotal,
    completedLessons: safeCompleted,
    percentage:
      safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100),
  };
}
