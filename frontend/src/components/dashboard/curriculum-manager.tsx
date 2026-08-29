"use client";

import { useState } from "react";

import type { Lesson, Quiz } from "@/lib/types";

import { LessonManager } from "./lesson-manager";
import { QuizManager } from "./quiz-manager";

type StepType = "lesson" | "quiz";

export function CurriculumManager({
  courseDocumentId,
  initialLessons,
  initialQuizzes,
}: {
  courseDocumentId: string;
  initialLessons: Lesson[];
  initialQuizzes: Quiz[];
}) {
  const [stepType, setStepType] = useState<StepType>("lesson");
  const steps = [
    ...initialLessons.map((lesson) => ({
      documentId: lesson.documentId,
      kind: "lesson" as const,
      position: lesson.position,
      title: lesson.title,
    })),
    ...initialQuizzes.map((quiz) => ({
      documentId: quiz.documentId,
      kind: "quiz" as const,
      position: quiz.position,
      title: quiz.title,
    })),
  ].sort((a, b) => a.position - b.position);
  const nextPosition = Math.max(0, ...steps.map(({ position }) => position)) + 1;

  return (
    <section className="curriculum-manager">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Course curriculum</p>
          <h2>Lessons and quiz steps</h2>
          <p>
            Every position is one required course step. Choose whether that step
            is a general text/video lesson or an auto-graded quiz.
          </p>
        </div>
        <span className="count-badge">{steps.length} total</span>
      </div>

      {steps.length ? (
        <ol className="managed-lessons curriculum-step-overview">
          {steps.map((step) => (
            <li key={`${step.kind}-${step.documentId}`}>
              <span className="lesson-position">{step.position}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.kind === "quiz" ? "Auto-graded quiz" : "General lesson"}</p>
              </div>
              <span className={`step-type-badge ${step.kind}`}>
                {step.kind === "quiz" ? "Quiz" : "Lesson"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">No course steps yet. Choose a type below.</p>
      )}

      <label className="step-type-selector">
        Step type to create or manage
        <select
          onChange={(event) => setStepType(event.target.value as StepType)}
          value={stepType}
        >
          <option value="lesson">General lesson — text, resources or video</option>
          <option value="quiz">Quiz — MCQ with automatic grading</option>
        </select>
        <small>
          Use the position field to place the selected type anywhere in the
          shared curriculum.
        </small>
      </label>

      {stepType === "lesson" ? (
        <LessonManager
          courseDocumentId={courseDocumentId}
          initialLessons={initialLessons}
          key={initialLessons
            .map(({ documentId, position, title }) =>
              `${documentId}:${position}:${title}`,
            )
            .join("|")}
          nextPosition={nextPosition}
        />
      ) : (
        <QuizManager
          courseDocumentId={courseDocumentId}
          initialQuizzes={initialQuizzes}
          key={initialQuizzes
            .map(({ documentId, position, title }) =>
              `${documentId}:${position}:${title}`,
            )
            .join("|")}
          nextPosition={nextPosition}
        />
      )}
    </section>
  );
}
