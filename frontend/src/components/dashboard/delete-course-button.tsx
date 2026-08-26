"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteCourseButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    setPending(true);
    const response = await fetch(`/api/lms/manage/courses/${documentId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push("/manage/courses");
      router.refresh();
      return;
    }
    setPending(false);
  }

  return (
    <button className="button danger" disabled={pending} onClick={remove} type="button">
      {pending ? "Deleting…" : "Delete course"}
    </button>
  );
}
