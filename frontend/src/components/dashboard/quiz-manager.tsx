"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { lmsMutation } from "@/lib/client-api";
import type { Quiz, QuizQuestion } from "@/lib/types";

type EditableQuestion = QuizQuestion & { correctOption: number };

const emptyQuestion = (): EditableQuestion => ({
  prompt: "",
  options: ["", ""],
  correctOption: 0,
});

function QuizEditor({
  courseDocumentId,
  defaultPosition,
  quiz,
  onSaved,
  onDeleted,
}: {
  courseDocumentId: string;
  defaultPosition: number;
  quiz?: Quiz;
  onSaved: (quiz: Quiz) => void;
  onDeleted?: (documentId: string) => void;
}) {
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [position, setPosition] = useState(quiz?.position ?? defaultPosition);
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    quiz?.questions.map((question) => ({
      ...question,
      correctOption: question.correctOption ?? 0,
    })) ?? [emptyQuestion()],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function updateQuestion(index: number, update: Partial<EditableQuestion>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...update } : question,
      ),
    );
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) {
    setQuestions((current) =>
      current.map((question, currentQuestion) =>
        currentQuestion === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOption) =>
                currentOption === optionIndex ? value : option,
              ),
            }
          : question,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const payload = { title, position, questions };
      const result = await lmsMutation<Quiz>(
        quiz
          ? `/api/lms/manage/quizzes/${quiz.documentId}`
          : `/api/lms/manage/courses/${courseDocumentId}/quizzes`,
        quiz ? "PUT" : "POST",
        payload,
      );
      onSaved(result.data);
      if (!quiz) {
        setTitle("");
        setPosition((current) => current + 1);
        setQuestions([emptyQuestion()]);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The quiz could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (
      !quiz ||
      !onDeleted ||
      !window.confirm(`Delete “${quiz.title}” and its attempt history?`)
    )
      return;
    setPending(true);
    setError("");
    try {
      await lmsMutation(`/api/lms/manage/quizzes/${quiz.documentId}`, "DELETE");
      onDeleted(quiz.documentId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The quiz could not be deleted.",
      );
      setPending(false);
    }
  }

  return (
    <form className="quiz-editor" onSubmit={submit}>
      <label>
        Quiz title
        <input
          maxLength={180}
          minLength={2}
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
      </label>
      <label>
        Course position
        <input
          min={1}
          onChange={(event) => setPosition(Number(event.target.value))}
          required
          type="number"
          value={position}
        />
      </label>
      <div className="question-editor-list">
        {questions.map((question, questionIndex) => (
          <fieldset key={questionIndex}>
            <div className="question-editor-heading">
              <legend>Question {questionIndex + 1}</legend>
              {questions.length > 1 && (
                <button
                  onClick={() =>
                    setQuestions((current) =>
                      current.filter((_, index) => index !== questionIndex),
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
            <label>
              Prompt
              <textarea
                maxLength={2000}
                minLength={3}
                onChange={(event) =>
                  updateQuestion(questionIndex, { prompt: event.target.value })
                }
                required
                rows={3}
                value={question.prompt}
              />
            </label>
            <div className="option-editor-list">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex}>
                  <input
                    aria-label={`Mark option ${optionIndex + 1} correct`}
                    checked={question.correctOption === optionIndex}
                    name={`correct-${questionIndex}`}
                    onChange={() =>
                      updateQuestion(questionIndex, {
                        correctOption: optionIndex,
                      })
                    }
                    type="radio"
                  />
                  <input
                    aria-label={`Option ${optionIndex + 1}`}
                    maxLength={500}
                    onChange={(event) =>
                      updateOption(
                        questionIndex,
                        optionIndex,
                        event.target.value,
                      )
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                    required
                    value={option}
                  />
                  {question.options.length > 2 && (
                    <button
                      aria-label={`Remove option ${optionIndex + 1}`}
                      onClick={() => {
                        const options = question.options.filter(
                          (_, index) => index !== optionIndex,
                        );
                        const correctOption =
                          question.correctOption === optionIndex
                            ? 0
                            : question.correctOption > optionIndex
                              ? question.correctOption - 1
                              : question.correctOption;
                        updateQuestion(questionIndex, {
                          options,
                          correctOption,
                        });
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {question.options.length < 8 && (
              <button
                className="add-option"
                onClick={() =>
                  updateQuestion(questionIndex, {
                    options: [...question.options, ""],
                  })
                }
                type="button"
              >
                + Add option
              </button>
            )}
          </fieldset>
        ))}
      </div>
      <button
        className="add-question"
        onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
        type="button"
      >
        + Add another question
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions split-actions">
        {quiz ? (
          <button
            className="button danger"
            disabled={pending}
            onClick={remove}
            type="button"
          >
            Delete quiz
          </button>
        ) : (
          <span />
        )}
        <button className="button secondary" disabled={pending} type="submit">
          {pending ? "Saving…" : quiz ? "Save quiz" : "Create quiz"}
        </button>
      </div>
    </form>
  );
}

export function QuizManager({
  courseDocumentId,
  initialQuizzes,
  nextPosition,
}: {
  courseDocumentId: string;
  initialQuizzes: Quiz[];
  nextPosition: number;
}) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  return (
    <section className="lesson-manager quiz-manager">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Assessment builder</p>
          <h2>Auto-graded quiz steps</h2>
        </div>
        <span className="count-badge">{quizzes.length} total</span>
      </div>
      {quizzes.length ? (
        <div className="managed-quiz-list">
          {quizzes.map((quiz) => (
            <details key={quiz.documentId}>
              <summary>
                <div>
                  <strong>{quiz.title}</strong>
                  <small>
                    Step {quiz.position} · {quiz.questions.length} questions
                  </small>
                </div>
                <span>Edit quiz</span>
              </summary>
              <QuizEditor
                courseDocumentId={courseDocumentId}
                defaultPosition={quiz.position}
                onDeleted={(documentId) => {
                  setQuizzes((current) =>
                    current.filter((item) => item.documentId !== documentId),
                  );
                  router.refresh();
                }}
                onSaved={(saved) => {
                  setQuizzes((current) =>
                    current.map((item) =>
                      item.documentId === saved.documentId ? saved : item,
                    ),
                  );
                  router.refresh();
                }}
                quiz={quiz}
              />
            </details>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No quizzes yet. Add one below for instant server-side grading.
        </p>
      )}
      <div className="new-quiz-panel">
        <h3>Create a quiz</h3>
        <p>
          Choose the correct option here. Students never receive that field from
          the API. Choose any unused course position to place this required quiz
          before, between, or after general lessons.
        </p>
        <QuizEditor
          courseDocumentId={courseDocumentId}
          defaultPosition={nextPosition}
          onSaved={(saved) => {
            setQuizzes((current) => [...current, saved]);
            router.refresh();
          }}
        />
      </div>
    </section>
  );
}
