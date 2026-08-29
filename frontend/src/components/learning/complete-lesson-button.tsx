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
        result.data.progress.percentage === 100
          ? "অভিনন্দন! আপনি এই course-এর সব lesson সম্পন্ন করেছেন।"
          : `অভিনন্দন! Lesson সম্পন্ন হয়েছে—course progress এখন ${result.data.progress.percentage}%।`,
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
      {isComplete && (
        <div className="completion-celebration" role="status">
          <span aria-hidden="true">🎉</span>
          <div>
            <strong>অভিনন্দন!</strong>
            <small>
              {nextHref
                ? "এই lesson শেষ হয়েছে। পরের lesson-এ এগিয়ে যান।"
                : "আপনি course-এর শেষ lesson-টিও সম্পন্ন করেছেন।"}
            </small>
          </div>
        </div>
      )}
      <button
        className={isComplete ? "button secondary" : "button primary"}
        disabled={pending}
        onClick={completeLesson}
        type="button"
      >
        {pending
          ? "সংরক্ষণ হচ্ছে…"
          : isComplete
            ? nextHref
              ? "পরের lesson-এ যান →"
              : "✓ Lesson সম্পন্ন"
            : "Lesson সম্পন্ন হিসেবে চিহ্নিত করুন"}
      </button>
      {message && <p aria-live="polite">{message}</p>}
    </div>
  );
}
