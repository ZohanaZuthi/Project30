import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizTaker } from "@/components/learning/quiz-taker";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getMyCourse, getStudentQuiz } from "@/lib/dal/lms";
import { learningStepHref } from "@/lib/student-learning";

export default async function QuizPage({
  params,
}: PageProps<"/learn/[courseDocumentId]/quizzes/[quizDocumentId]">) {
  const { courseDocumentId, quizDocumentId } = await params;
  const user = await requireRole([APP_ROLES.STUDENT]);
  const [learning, quiz] = await Promise.all([
    getMyCourse(courseDocumentId),
    getStudentQuiz(courseDocumentId, quizDocumentId),
  ]);
  if (!learning || !quiz) notFound();
  const steps = learning.progress.steps ?? [];
  const currentIndex = steps.findIndex(
    (step) => step.kind === "quiz" && step.documentId === quizDocumentId,
  );
  if (currentIndex < 0) notFound();
  const next = steps[currentIndex + 1];

  return (
    <DashboardShell user={user}>
      <div className="quiz-page-heading">
        <Link href={`/learn/${courseDocumentId}`}>
          ← {learning.course.title}
        </Link>
        <p className="eyebrow">Auto-graded assessment</p>
        <span className="quiz-step-label">
          Course step {currentIndex + 1} of {steps.length}
        </span>
        <h1>{quiz.title}</h1>
        <p>
          {quiz.questions.length} questions. Select one answer for each; your
          score is calculated securely by Strapi.
        </p>
      </div>
      <QuizTaker
        courseDocumentId={courseDocumentId}
        nextHref={
          next
            ? learningStepHref(courseDocumentId, next)
            : `/learn/${courseDocumentId}`
        }
        quiz={quiz}
      />
    </DashboardShell>
  );
}
