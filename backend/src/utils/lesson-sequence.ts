export type OrderedLesson = {
  documentId: string;
  title: string;
  position: number;
};

export type LearningStepKind = 'lesson' | 'quiz';

export type OrderedLearningStep = OrderedLesson & {
  kind: LearningStepKind;
};

export function learningStepKey(
  kind: LearningStepKind,
  documentId: string
) {
  return `${kind}:${documentId}`;
}

export function addLearningStepLocks<T extends OrderedLearningStep>(
  steps: T[],
  completedStepKeys: ReadonlySet<string>
) {
  let everyPreviousStepIsComplete = true;

  return steps.map((step) => {
    const key = learningStepKey(step.kind, step.documentId);
    const locked = !everyPreviousStepIsComplete;
    everyPreviousStepIsComplete =
      everyPreviousStepIsComplete && completedStepKeys.has(key);
    return { ...step, locked };
  });
}

export function addLessonLocks<T extends OrderedLesson>(
  lessons: T[],
  completedLessonIds: ReadonlySet<string>
) {
  const steps = lessons.map((lesson) => ({ ...lesson, kind: 'lesson' as const }));
  const completedStepKeys = new Set(
    [...completedLessonIds].map((documentId) =>
      learningStepKey('lesson', documentId)
    )
  );
  return addLearningStepLocks(steps, completedStepKeys).map(
    ({ kind: _kind, ...lesson }) => lesson
  );
}
