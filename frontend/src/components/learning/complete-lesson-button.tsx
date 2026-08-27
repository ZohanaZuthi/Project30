"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { lmsMutation } from "@/lib/client-api";
import type { CourseProgress } from "@/lib/types";

export function CompleteLessonButton({
  courseDocumentId,
  lessonDocumentId,
  completed,
  nextHref,
}: {
  courseDocumentId: string;
  lessonDocumentId: string;
  completed: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState(completed);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function completeLesson() {
    if (isComplete) {
      if (nextHref) router.push(nextHref);
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const result = await lmsMutation<{
        progress: CourseProgress;
        alreadyCompleted: boolean;
      }>(
        `/api/lms/my-courses/${encodeURIComponent(courseDocumentId)}/lessons/${encodeURIComponent(lessonDocumentId)}/complete`,
        "PUT",
      );
      setIsComplete(true);
      setMessage(
        `Saved — course progress is now ${result.data.progress.percentage}%.`,
      );
      router.refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Progress could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="completion-action">
      <button
        className={isComplete ? "button secondary" : "button primary"}
        disabled={pending}
        onClick={completeLesson}
        type="button"
      >
        {pending
          ? "Saving…"
          : isComplete
            ? nextHref
              ? "Continue to next lesson →"
              : "✓ Lesson completed"
            : "Mark lesson complete"}
      </button>
      {message && <p aria-live="polite">{message}</p>}
    </div>
  );
}
