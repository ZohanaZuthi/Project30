import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizTaker } from "@/components/learning/quiz-taker";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getMyCourse, getStudentQuiz } from "@/lib/dal/lms";

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

  return (
    <DashboardShell user={user}>
      <div className="quiz-page-heading">
        <Link href={`/learn/${courseDocumentId}`}>
          ← {learning.course.title}
        </Link>
        <p className="eyebrow">Auto-graded assessment</p>
        <h1>{quiz.title}</h1>
        <p>
          {quiz.questions.length} questions. Select one answer for each; your
          score is calculated securely by Strapi.
        </p>
      </div>
      <QuizTaker courseDocumentId={courseDocumentId} quiz={quiz} />
    </DashboardShell>
  );
}
