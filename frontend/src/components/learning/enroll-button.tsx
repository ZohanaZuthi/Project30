"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { lmsMutation } from "@/lib/client-api";

export function EnrollButton({
  courseDocumentId,
}: {
  courseDocumentId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function enroll() {
    setPending(true);
    setError("");
    try {
      await lmsMutation(
        `/api/lms/courses/${encodeURIComponent(courseDocumentId)}/enroll`,
        "POST",
      );
      router.push(`/learn/${courseDocumentId}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enrollment failed.");
      setPending(false);
    }
  }

  return (
    <div className="enroll-action">
      <button disabled={pending} onClick={enroll} type="button">
        {pending ? "Enroll হচ্ছে…" : "ফ্রি enroll করুন →"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
