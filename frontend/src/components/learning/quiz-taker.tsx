"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { lmsMutation } from "@/lib/client-api";
import type { Quiz, QuizResult } from "@/lib/types";

export function QuizTaker({
  courseDocumentId,
  quiz,
}: {
  courseDocumentId: string;
  quiz: Quiz;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const answers = quiz.questions.map((_, index) =>
      Number(form.get(`question-${index}`)),
    );
    if (answers.some((answer) => !Number.isInteger(answer) || answer < 0)) {
      setError("Please answer every question before submitting.");
      setPending(false);
      return;
    }
    try {
      const response = await lmsMutation<QuizResult>(
        `/api/lms/my-courses/${encodeURIComponent(courseDocumentId)}/quizzes/${encodeURIComponent(quiz.documentId)}/attempts`,
        "POST",
        { answers },
      );
      setResult(response.data);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Quiz submission failed.",
      );
    } finally {
      setPending(false);
    }
  }

  if (result) {
    const passed = result.percentage >= 60;
    return (
      <section className="quiz-result" aria-live="polite">
        <span>{passed ? "Great work" : "Keep learning"}</span>
        <strong>{result.percentage}%</strong>
        <h2>
          {result.score} out of {result.total} correct
        </h2>
        <p>
          {passed
            ? "You have a strong grasp of this topic."
            : "Review the lessons and try again when you are ready."}
        </p>
        <div>
          <button
            className="button secondary"
            onClick={() => setResult(null)}
            type="button"
          >
            Try again
          </button>
          <Link className="button primary" href="/quiz-attempts">
            View result history
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form className="quiz-form" onSubmit={submit}>
      {quiz.questions.map((question, questionIndex) => (
        <fieldset key={`${question.prompt}-${questionIndex}`}>
          <legend>
            <span>{String(questionIndex + 1).padStart(2, "0")}</span>
            {question.prompt}
          </legend>
          <div className="quiz-options">
            {question.options.map((option, optionIndex) => (
              <label key={`${option}-${optionIndex}`}>
                <input
                  name={`question-${questionIndex}`}
                  required
                  type="radio"
                  value={optionIndex}
                />
                <i>{String.fromCharCode(65 + optionIndex)}</i>
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary quiz-submit"
        disabled={pending}
        type="submit"
      >
        {pending ? "Grading securely…" : "Submit for instant result →"}
      </button>
    </form>
  );
}
