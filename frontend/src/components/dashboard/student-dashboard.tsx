import Link from "next/link";

import { ProgressMeter } from "@/components/learning/progress-meter";
import { summarizeStudentLearning } from "@/lib/student-learning";
import type { Enrollment } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function StudentDashboard({
  enrollments,
  username,
}: {
  enrollments: Enrollment[];
  username: string;
}) {
  const summary = summarizeStudentLearning(enrollments);
  const primaryCourse = summary.nextCourse ?? summary.courses[0] ?? null;

  return (
    <div className="student-dashboard">
      <section className="student-dashboard-hero">
        <div>
          <p className="eyebrow">Your learning dashboard</p>
          <h1>Welcome back, {username}.</h1>
          <p>
            {primaryCourse?.nextLesson
              ? `Continue ${primaryCourse.enrollment.course.title} from ${primaryCourse.nextLesson.title}.`
              : enrollments.length
                ? "You are caught up. Review a course or take its quiz when you are ready."
                : "Enroll in your first course to begin tracking real lesson progress."}
          </p>
          <div className="student-hero-actions">
            <Link
              className="button primary"
              href={primaryCourse?.href ?? "/courses"}
            >
              {primaryCourse?.nextLesson
                ? "Continue next lesson →"
                : enrollments.length
                  ? "Open my courses →"
                  : "Explore courses →"}
            </Link>
            {enrollments.length > 0 && (
              <Link className="button secondary" href="/learn">
                View all courses
              </Link>
            )}
          </div>
        </div>
        <div className="student-overall-progress">
          <span>Overall progress</span>
          <strong>{summary.percentage}%</strong>
          <small>
            {summary.completedLessons} of {summary.totalLessons} lessons complete
          </small>
        </div>
      </section>

      <section className="student-stat-grid" aria-label="Learning summary">
        <article>
          <span>Enrolled courses</span>
          <strong>{enrollments.length}</strong>
          <small>In your learning library</small>
        </article>
        <article>
          <span>Lessons completed</span>
          <strong>{summary.completedLessons}</strong>
          <small>{summary.totalLessons} lessons available</small>
        </article>
        <article>
          <span>Last 7 days</span>
          <strong>{summary.completedLast7Days}</strong>
          <small>Calculated from saved completion dates</small>
        </article>
        <article>
          <span>Next lesson</span>
          <strong className="student-next-stat">
            {summary.nextCourse?.nextLesson?.position ?? "—"}
          </strong>
          <small>
            {summary.nextCourse?.nextLesson?.title ?? "Nothing waiting"}
          </small>
        </article>
      </section>

      {enrollments.length === 0 ? (
        <section className="empty-panel learning-empty">
          <span>⌁</span>
          <h2>No course progress yet</h2>
          <p>
            A new account starts at zero. Enroll in a published course and your
            completed lessons will appear here automatically.
          </p>
          <Link className="button primary" href="/courses">
            Browse available courses
          </Link>
        </section>
      ) : (
        <div className="student-dashboard-layout">
          <section className="student-course-section">
            <div className="student-section-heading">
              <div>
                <p className="eyebrow">Your courses</p>
                <h2>Continue exactly where you stopped</h2>
              </div>
              <Link href="/learn">Full learning library →</Link>
            </div>
            <div className="student-course-list">
              {summary.courses.map(
                ({ enrollment, nextLesson, lastCompletedLesson, href, actionLabel }) => (
                  <article key={enrollment.course.documentId}>
                    <div className="student-course-card-heading">
                      <div>
                        <span>{
                          enrollment.progress.percentage === 100
                            ? "Course completed"
                            : nextLesson
                              ? "Ready to continue"
                              : "Course overview"
                        }</span>
                        <h3>{enrollment.course.title}</h3>
                      </div>
                      <strong>{enrollment.progress.percentage}%</strong>
                    </div>
                    <ProgressMeter
                      compact
                      completed={enrollment.progress.completedLessons}
                      percentage={enrollment.progress.percentage}
                      total={enrollment.progress.totalLessons}
                    />
                    <div className="student-course-checkpoints">
                      <p>
                        <span>Last finished</span>
                        <strong>
                          {lastCompletedLesson?.title ?? "No lesson completed yet"}
                        </strong>
                      </p>
                      <p>
                        <span>Up next</span>
                        <strong>
                          {nextLesson?.title ??
                            (enrollment.progress.percentage === 100
                              ? "Course complete"
                              : "Open course overview")}
                        </strong>
                      </p>
                    </div>
                    <Link className="student-course-action" href={href}>
                      {actionLabel}
                    </Link>
                  </article>
                ),
              )}
            </div>
          </section>

          <aside className="student-activity-panel">
            <p className="eyebrow">Recent activity</p>
            <h2>What you finished</h2>
            {summary.completedActivity.length > 0 ? (
              <div>
                {summary.completedActivity.slice(0, 6).map((activity) => (
                  <Link
                    href={`/learn/${activity.courseDocumentId}/lessons/${activity.lesson.documentId}`}
                    key={`${activity.courseDocumentId}-${activity.lesson.documentId}`}
                  >
                    <span>✓</span>
                    <div>
                      <strong>{activity.lesson.title}</strong>
                      <small>
                        {activity.courseTitle} · {formatDate(activity.lesson.completedAt)}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="student-no-activity">
                <span>○</span>
                <p>
                  Complete your first lesson and it will be recorded here with
                  its completion date.
                </p>
              </div>
            )}
            <Link className="text-link" href="/quiz-attempts">
              View quiz results →
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
