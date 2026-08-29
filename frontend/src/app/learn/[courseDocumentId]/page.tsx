import Link from "next/link";
import { notFound } from "next/navigation";

import { TextWithLinks } from "@/components/content/text-with-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProgressMeter } from "@/components/learning/progress-meter";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import {
  getMyCourse,
  getMyQuizAttempts,
} from "@/lib/dal/lms";
import { learningStepHref } from "@/lib/student-learning";

export default async function LearningCoursePage({
  params,
}: PageProps<"/learn/[courseDocumentId]">) {
  const { courseDocumentId } = await params;
  const user = await requireRole([APP_ROLES.STUDENT]);
  const [learning, attempts] = await Promise.all([
    getMyCourse(courseDocumentId),
    getMyQuizAttempts(),
  ]);
  if (!learning) notFound();
  const { course, progress } = learning;
  const steps = progress.steps ?? [];
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
          <p className="text-with-links">
            <TextWithLinks text={course.description} />
          </p>
        </div>
        <ProgressMeter
          completed={progress.completedSteps}
          percentage={progress.percentage}
          total={progress.totalSteps}
        />
      </div>
      <div className="learning-layout">
        <section className="curriculum-workspace">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Curriculum</p>
              <h2>Continue step by step</h2>
            </div>
            <span className="count-badge">{steps.length} learning steps</span>
          </div>
          <ol className="learning-lesson-list">
            {steps.map((step, index) => {
              const stepContent = (
                <>
                  <span>
                    {step.completed
                      ? "✓"
                      : step.kind === "quiz"
                        ? "Q"
                      : String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>
                      {step.completed
                        ? step.kind === "quiz"
                          ? "Quiz attempted · result saved"
                          : "Lesson completed"
                        : step.locked
                          ? "Complete the previous course step first"
                          : step.kind === "quiz"
                            ? "Ready for instant grading"
                            : "Ready to learn"}
                    </small>
                  </div>
                  <b className={step.locked ? "locked-lesson-action" : undefined}>
                    {step.locked
                      ? "🔒 Locked"
                      : step.completed
                        ? "Review →"
                        : step.kind === "quiz"
                          ? "Take quiz →"
                          : "Start lesson →"}
                  </b>
                </>
              );
              return (
                <li
                  className={
                    step.completed ? "complete" : step.locked ? "locked" : ""
                  }
                  key={`${step.kind}-${step.documentId}`}
                >
                  {step.locked ? (
                    <div className="learning-lesson-row">{stepContent}</div>
                  ) : (
                    <Link
                      className="learning-lesson-row"
                      href={learningStepHref(courseDocumentId, step)}
                    >
                      {stepContent}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
        <aside className="learning-sidebar">
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
