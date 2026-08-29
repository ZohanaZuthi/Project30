export type OrderedLesson = {
  documentId: string;
  title: string;
  position: number;
};

export function addLessonLocks<T extends OrderedLesson>(
  lessons: T[],
  completedLessonIds: ReadonlySet<string>
) {
  let everyPreviousLessonIsComplete = true;

  return lessons.map((lesson) => {
    const locked = !everyPreviousLessonIsComplete;
    everyPreviousLessonIsComplete =
      everyPreviousLessonIsComplete && completedLessonIds.has(lesson.documentId);
    return { ...lesson, locked };
  });
}
