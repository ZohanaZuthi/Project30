"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { Course } from "@/lib/types";

export function CourseForm({
  course,
  instructors = [],
}: {
  course?: Course;
  instructors?: Array<{ documentId: string; username: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const editing = Boolean(course);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      description: form.get("description"),
      thumbnailUrl: form.get("thumbnailUrl"),
      publish: form.get("publish") === "on",
      ...(form.has("instructorDocumentId")
        ? {
            instructorDocumentId: form.get("instructorDocumentId") || undefined,
          }
        : {}),
    };
    const endpoint = editing
      ? `/api/lms/manage/courses/${course?.documentId}`
      : "/api/lms/manage/courses";
    const response = await fetch(endpoint, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response?.ok) {
      const result = (await response?.json().catch(() => null)) as {
        error?: { message?: string };
        message?: string;
      } | null;
      setError(
        result?.error?.message ??
          result?.message ??
          "Could not save the course.",
      );
      setPending(false);
      return;
    }

    const result = (await response.json()) as { data: Course };
    router.push(`/manage/courses/${result.data.documentId}/edit`);
    router.refresh();
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <label>
        Course title
        <input
          name="title"
          defaultValue={course?.title}
          minLength={3}
          maxLength={160}
          required
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          defaultValue={course?.description}
          rows={7}
          required
        />
      </label>
      <label>
        Thumbnail URL <span className="optional">optional</span>
        <input
          name="thumbnailUrl"
          type="url"
          defaultValue={course?.thumbnailUrl ?? ""}
        />
      </label>
      {instructors.length > 0 && (
        <label>
          Assigned instructor <span className="optional">optional</span>
          <select
            defaultValue={course?.instructor?.documentId ?? ""}
            name="instructorDocumentId"
          >
            <option value="">Unassigned / academy team</option>
            {instructors.map((instructor) => (
              <option key={instructor.documentId} value={instructor.documentId}>
                {instructor.username}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="check-row">
        <input
          name="publish"
          type="checkbox"
          defaultChecked={Boolean(course?.publishedAt)}
        />
        Publish this course so it appears in the public catalog
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button primary" disabled={pending} type="submit">
          {pending ? "Saving…" : editing ? "Save course" : "Create course"}
        </button>
      </div>
    </form>
  );
}
