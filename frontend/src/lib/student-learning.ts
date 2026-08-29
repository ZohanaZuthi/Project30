import type { Enrollment, ProgressLesson } from "./types";

export type CourseLearningStatus = {
  enrollment: Enrollment;
  nextLesson: ProgressLesson | null;
  lastCompletedLesson: ProgressLesson | null;
  href: string;
  actionLabel: string;
};

export type CompletedLearningActivity = {
  courseDocumentId: string;
  courseTitle: string;
  lesson: ProgressLesson;
};

function completedAtTime(lesson: ProgressLesson) {
  return lesson.completedAt ? new Date(lesson.completedAt).getTime() : 0;
}

export function getCourseLearningStatus(
  enrollment: Enrollment,
): CourseLearningStatus {
  const lessons = enrollment.progress.lessons ?? [];
  const nextLesson =
    lessons.find((lesson) => !lesson.completed && !lesson.locked) ?? null;
  const lastCompletedLesson =
    lessons
      .filter((lesson) => lesson.completed)
      .sort((left, right) => completedAtTime(right) - completedAtTime(left))[0] ??
    null;
  const courseHref = `/learn/${enrollment.course.documentId}`;
  const href = nextLesson
    ? `${courseHref}/lessons/${nextLesson.documentId}`
    : courseHref;
  const complete =
    enrollment.progress.totalLessons > 0 &&
    enrollment.progress.completedLessons >= enrollment.progress.totalLessons;

  return {
    enrollment,
    nextLesson,
    lastCompletedLesson,
    href,
    actionLabel: nextLesson
      ? enrollment.progress.completedLessons > 0
        ? "Continue from here →"
        : "Start first lesson →"
      : complete
        ? "Review completed course →"
        : "Open course →",
  };
}

export function summarizeStudentLearning(enrollments: Enrollment[]) {
  const courses = enrollments.map(getCourseLearningStatus);
  const totalLessons = enrollments.reduce(
    (total, enrollment) => total + enrollment.progress.totalLessons,
    0,
  );
  const completedLessons = enrollments.reduce(
    (total, enrollment) => total + enrollment.progress.completedLessons,
    0,
  );
  const percentage =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);
  const completedActivity = courses
    .flatMap(({ enrollment }) =>
      (enrollment.progress.lessons ?? [])
        .filter((lesson) => lesson.completed && lesson.completedAt)
        .map((lesson) => ({
          courseDocumentId: enrollment.course.documentId,
          courseTitle: enrollment.course.title,
          lesson,
        })),
    )
    .sort(
      (left, right) =>
        completedAtTime(right.lesson) - completedAtTime(left.lesson),
    );
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedLast7Days = completedActivity.filter(
    ({ lesson }) => completedAtTime(lesson) >= sevenDaysAgo,
  ).length;

  return {
    courses,
    totalLessons,
    completedLessons,
    percentage,
    completedLast7Days,
    completedActivity,
    nextCourse: courses.find(({ nextLesson }) => nextLesson) ?? null,
  };
}
