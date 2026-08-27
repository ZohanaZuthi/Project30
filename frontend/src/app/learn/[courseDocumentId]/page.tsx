import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProgressMeter } from "@/components/learning/progress-meter";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import {
  getMyCourse,
  getMyQuizAttempts,
  getStudentQuizzes,
} from "@/lib/dal/lms";

export default async function LearningCoursePage({
  params,
}: PageProps<"/learn/[courseDocumentId]">) {
  const { courseDocumentId } = await params;
  const user = await requireRole([APP_ROLES.STUDENT]);
  const [learning, quizzes, attempts] = await Promise.all([
    getMyCourse(courseDocumentId),
    getStudentQuizzes(courseDocumentId),
    getMyQuizAttempts(),
  ]);
  if (!learning) notFound();
  const { course, progress } = learning;
  const completedById = new Map(
    progress.lessons?.map((lesson) => [lesson.documentId, lesson]) ?? [],
  );
  const courseAttempts = attempts.filter(
    (attempt) => attempt.quiz?.course?.documentId === courseDocumentId,
  );

  return (
    <DashboardShell user={user}>
      <div className="learning-heading">
        <div>
          <Link href="/learn">← My courses</Link>
          <p className="eyebrow">Learning path</p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <ProgressMeter
          completed={progress.completedLessons}
          percentage={progress.percentage}
          total={progress.totalLessons}
        />
      </div>
      <div className="learning-layout">
        <section className="curriculum-workspace">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Curriculum</p>
              <h2>Continue lesson by lesson</h2>
            </div>
            <span className="count-badge">{course.lessons.length} lessons</span>
          </div>
          <ol className="learning-lesson-list">
            {course.lessons.map((lesson, index) => {
              const status = completedById.get(lesson.documentId);
              return (
                <li
                  className={status?.completed ? "complete" : ""}
                  key={lesson.documentId}
                >
                  <span>
                    {status?.completed
                      ? "✓"
                      : String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <small>
                      {status?.completed
                        ? "Completed"
                        : index === 0 ||
                            completedById.get(
                              course.lessons[index - 1]?.documentId,
                            )?.completed
                          ? "Ready to learn"
                          : "Available anytime"}
                    </small>
                  </div>
                  <Link
                    href={`/learn/${courseDocumentId}/lessons/${lesson.documentId}`}
                  >
                    {status?.completed ? "Review" : "Open"} →
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
        <aside className="learning-sidebar">
          <section>
            <p className="eyebrow">Course quizzes</p>
            <h2>Check your knowledge</h2>
            {quizzes.length ? (
              quizzes.map((quiz) => (
                <Link
                  className="quiz-link-card"
                  href={`/learn/${courseDocumentId}/quizzes/${quiz.documentId}`}
                  key={quiz.documentId}
                >
                  <div>
                    <strong>{quiz.title}</strong>
                    <small>
                      {quiz.questions.length} questions · instant grading
                    </small>
                  </div>
                  <span>Start →</span>
                </Link>
              ))
            ) : (
              <p className="empty-state">No quiz has been added yet.</p>
            )}
          </section>
          <section>
            <p className="eyebrow">Recent results</p>
            <h2>Your attempts</h2>
            {courseAttempts.length ? (
              courseAttempts.slice(0, 3).map((attempt) => (
                <div className="mini-attempt" key={attempt.documentId}>
                  <div>
                    <strong>{attempt.quiz?.title}</strong>
                    <small>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(attempt.submittedAt))}
                    </small>
                  </div>
                  <span>{attempt.percentage}%</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Your quiz results will appear here.</p>
            )}
            <Link className="text-link" href="/quiz-attempts">
              All result history
            </Link>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}
