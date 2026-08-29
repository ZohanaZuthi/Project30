import type { Enrollment, ProgressStep } from "./types";

export type CourseLearningStatus = {
  enrollment: Enrollment;
  nextStep: ProgressStep | null;
  lastCompletedStep: ProgressStep | null;
  href: string;
  actionLabel: string;
};

export type CompletedLearningActivity = {
  courseDocumentId: string;
  courseTitle: string;
  step: ProgressStep;
};

function completedAtTime(step: ProgressStep) {
  return step.completedAt ? new Date(step.completedAt).getTime() : 0;
}

export function learningStepHref(
  courseDocumentId: string,
  step: Pick<ProgressStep, "kind" | "documentId">,
) {
  const segment = step.kind === "quiz" ? "quizzes" : "lessons";
  return `/learn/${courseDocumentId}/${segment}/${step.documentId}`;
}

export function getCourseLearningStatus(
  enrollment: Enrollment,
): CourseLearningStatus {
  const steps = enrollment.progress.steps ?? [];
  const nextStep =
    steps.find((step) => !step.completed && !step.locked) ?? null;
  const lastCompletedStep =
    steps
      .filter((step) => step.completed)
      .sort((left, right) => completedAtTime(right) - completedAtTime(left))[0] ??
    null;
  const courseHref = `/learn/${enrollment.course.documentId}`;
  const href = nextStep
    ? learningStepHref(enrollment.course.documentId, nextStep)
    : courseHref;
  const complete =
    enrollment.progress.totalSteps > 0 &&
    enrollment.progress.completedSteps >= enrollment.progress.totalSteps;

  return {
    enrollment,
    nextStep,
    lastCompletedStep,
    href,
    actionLabel: nextStep
      ? enrollment.progress.completedSteps > 0
        ? "Continue from here →"
        : "Start first step →"
      : complete
        ? "Review completed course →"
        : "Open course →",
  };
}

export function summarizeStudentLearning(enrollments: Enrollment[]) {
  const courses = enrollments.map(getCourseLearningStatus);
  const totalSteps = enrollments.reduce(
    (total, enrollment) => total + enrollment.progress.totalSteps,
    0,
  );
  const completedSteps = enrollments.reduce(
    (total, enrollment) => total + enrollment.progress.completedSteps,
    0,
  );
  const percentage =
    totalSteps === 0
      ? 0
      : Math.round((completedSteps / totalSteps) * 100);
  const completedActivity = courses
    .flatMap(({ enrollment }) =>
      (enrollment.progress.steps ?? [])
        .filter((step) => step.completed && step.completedAt)
        .map((step) => ({
          courseDocumentId: enrollment.course.documentId,
          courseTitle: enrollment.course.title,
          step,
        })),
    )
    .sort(
      (left, right) =>
        completedAtTime(right.step) - completedAtTime(left.step),
    );
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedLast7Days = completedActivity.filter(
    ({ step }) => completedAtTime(step) >= sevenDaysAgo,
  ).length;

  return {
    courses,
    totalSteps,
    completedSteps,
    percentage,
    completedLast7Days,
    completedActivity,
    nextCourse: courses.find(({ nextStep }) => nextStep) ?? null,
  };
}
