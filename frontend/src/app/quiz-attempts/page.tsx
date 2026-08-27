import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getMyQuizAttempts } from "@/lib/dal/lms";

export default async function QuizAttemptsPage() {
  const user = await requireRole([APP_ROLES.STUDENT]);
  const attempts = await getMyQuizAttempts();
  return (
    <DashboardShell user={user}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Assessment history</p>
          <h1>Quiz results</h1>
          <p>
            Every attempt is stored by Strapi and remains available after
            refresh.
          </p>
        </div>
        <Link className="button secondary" href="/learn">
          My courses
        </Link>
      </div>
      {attempts.length ? (
        <div className="attempt-history">
          {attempts.map((attempt) => (
            <article key={attempt.documentId}>
              <div className="attempt-score">
                <strong>{attempt.percentage}%</strong>
                <span>
                  {attempt.score}/{attempt.total}
                </span>
              </div>
              <div>
                <small>{attempt.quiz?.course?.title ?? "Course"}</small>
                <h2>{attempt.quiz?.title ?? "Quiz"}</h2>
                <p>
                  Submitted{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(attempt.submittedAt))}
                </p>
              </div>
              {attempt.quiz?.course && (
                <Link
                  href={`/learn/${attempt.quiz.course.documentId}/quizzes/${attempt.quiz.documentId}`}
                >
                  Retake →
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-panel">
          <h2>No quiz attempts yet</h2>
          <p>Complete a course quiz and your result will be stored here.</p>
          <Link className="button primary" href="/learn">
            Go to my courses
          </Link>
        </section>
      )}
    </DashboardShell>
  );
}
