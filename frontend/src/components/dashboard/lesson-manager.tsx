"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { Lesson } from "@/lib/types";

export function LessonManager({
  courseDocumentId,
  initialLessons,
  nextPosition,
}: {
  courseDocumentId: string;
  initialLessons: Lesson[];
  nextPosition: number;
}) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);
  const [newPosition, setNewPosition] = useState(nextPosition);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(
      `/api/lms/manage/courses/${courseDocumentId}/lessons`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          content: form.get("content"),
          videoUrl: form.get("videoUrl"),
          position: Number(form.get("position")),
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      const result = (await response?.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setError(result?.error?.message ?? "Could not add the lesson.");
      setPending(false);
      return;
    }

    const result = (await response.json()) as { data: Lesson };
    setLessons((current) => [...current, result.data].sort((a, b) => a.position - b.position));
    formElement.reset();
    setNewPosition((current) => current + 1);
    setPending(false);
    router.refresh();
  }

  async function deleteLesson(documentId: string) {
    setError("");
    const response = await fetch(`/api/lms/manage/lessons/${documentId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Could not delete the lesson.");
      return;
    }
    setLessons((current) => current.filter((lesson) => lesson.documentId !== documentId));
    router.refresh();
  }

  async function updateLesson(
    event: FormEvent<HTMLFormElement>,
    documentId: string,
  ) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/lms/manage/lessons/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        content: form.get("content"),
        videoUrl: form.get("videoUrl"),
        position: Number(form.get("position")),
      }),
    });
    if (!response.ok) {
      setError("Could not update the lesson.");
      return;
    }
    const result = (await response.json()) as { data: Lesson };
    setLessons((current) =>
      current
        .map((lesson) =>
          lesson.documentId === documentId ? result.data : lesson,
        )
        .sort((a, b) => a.position - b.position),
    );
    router.refresh();
  }

  return (
    <section className="lesson-manager">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Course content</p>
          <h2>General lesson steps</h2>
        </div>
        <span className="count-badge">{lessons.length} total</span>
      </div>
      {lessons.length > 0 ? (
        <ol className="managed-lessons">
          {lessons.map((lesson) => (
            <li key={lesson.documentId}>
              <span className="lesson-position">{lesson.position}</span>
              <div>
                <strong>{lesson.title}</strong>
                <p>{lesson.videoUrl ? "Text + video lesson" : "Text lesson"}</p>
              </div>
              <div className="lesson-actions">
                <details>
                  <summary>Edit</summary>
                  <form
                    className="inline-lesson-form"
                    onSubmit={(event) => updateLesson(event, lesson.documentId)}
                  >
                    <label>Title<input name="title" defaultValue={lesson.title} required /></label>
                    <label>Position<input name="position" type="number" min={1} defaultValue={lesson.position} required /></label>
                    <label>
                      Notes and resources
                      <span className="field-help">Paste full http(s) resource links to make them clickable for students.</span>
                      <textarea name="content" rows={4} defaultValue={lesson.content} />
                    </label>
                    <label>Video URL<input name="videoUrl" type="url" defaultValue={lesson.videoUrl ?? ""} /></label>
                    <button className="button secondary" type="submit">Save lesson</button>
                  </form>
                </details>
                <button className="danger-link" onClick={() => deleteLesson(lesson.documentId)} type="button">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">No lessons yet. Add the first one below.</p>
      )}
      <form className="editor-form compact" onSubmit={createLesson}>
        <h3>Add a lesson</h3>
        <div className="field-grid">
          <label>
            Title
            <input name="title" minLength={2} required />
          </label>
          <label>
            Position
            <input
              name="position"
              type="number"
              min={1}
              onChange={(event) => setNewPosition(Number(event.target.value))}
              value={newPosition}
              required
            />
          </label>
        </div>
        <label>
          Lesson notes and resources
          <span className="field-help">
            Add explanatory text and full http(s) resource links; students can
            open those links in a new tab.
          </span>
          <textarea name="content" rows={5} />
        </label>
        <label>
          Video URL <span className="optional">optional</span>
          <input name="videoUrl" type="url" />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button secondary" disabled={pending} type="submit">
          {pending ? "Adding…" : "Add lesson"}
        </button>
      </form>
    </section>
  );
}
