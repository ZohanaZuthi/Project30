import Image from "next/image";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProgressMeter } from "@/components/learning/progress-meter";
import { APP_ROLES } from "@/lib/auth/constants";
import { getCoursePresentation } from "@/lib/course-presentation";
import { requireRole } from "@/lib/dal/auth";
import { getMyCourses } from "@/lib/dal/lms";
import { getCourseLearningStatus } from "@/lib/student-learning";

export default async function MyCoursesPage() {
  const user = await requireRole([APP_ROLES.STUDENT]);
  const enrollments = await getMyCourses();

  return (
    <DashboardShell user={user}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Student workspace</p>
          <h1>My courses</h1>
          <p>Resume lessons, monitor completion, and take course quizzes.</p>
        </div>
        <Link className="button primary" href="/courses">
          Explore courses
        </Link>
      </div>
      {enrollments.length ? (
        <div className="learning-course-grid">
          {enrollments.map((enrollment, index) => {
            const { course, progress, enrolledAt } = enrollment;
            const view = getCoursePresentation(course, index);
            const learningStatus = getCourseLearningStatus(enrollment);
            return (
              <article className="learning-course-card" key={course.documentId}>
                <div className="learning-card-image">
                  <Image
                    alt={`${course.title} cover`}
                    fill
                    sizes="(max-width: 760px) 100vw, 50vw"
                    src={view.image}
                  />
                  <span>{view.category}</span>
                </div>
                <div className="learning-card-body">
                  <small>
                    Enrolled{" "}
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(new Date(enrolledAt))}
                  </small>
                  <h2>{course.title}</h2>
                  <ProgressMeter
                    compact
                    completed={progress.completedLessons}
                    percentage={progress.percentage}
                    total={progress.totalLessons}
                  />
                  <p className="learning-card-next">
                    <span>Up next</span>
                    <strong>
                      {learningStatus.nextLesson?.title ??
                        (progress.percentage === 100
                          ? "Course completed"
                          : "Open course overview")}
                    </strong>
                  </p>
                  <Link
                    className="button primary"
                    href={learningStatus.href}
                  >
                    {learningStatus.actionLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="empty-panel learning-empty">
          <span>⌁</span>
          <h2>Your learning shelf is empty</h2>
          <p>
            Choose a course and enroll with one click. Your progress will be
            saved here.
          </p>
          <Link className="button primary" href="/courses">
            Browse available courses
          </Link>
        </section>
      )}
    </DashboardShell>
  );
}
