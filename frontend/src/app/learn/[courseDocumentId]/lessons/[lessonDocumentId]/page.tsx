import Link from "next/link";
import { notFound } from "next/navigation";

import { TextWithLinks } from "@/components/content/text-with-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CompleteLessonButton } from "@/components/learning/complete-lesson-button";
import { ProgressMeter } from "@/components/learning/progress-meter";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getMyCourse, getMyProgress, getStudentLesson } from "@/lib/dal/lms";
import { learningStepHref } from "@/lib/student-learning";
import { getYouTubeEmbedUrl } from "@/lib/video";

export default async function LessonPage({
  params,
}: PageProps<"/learn/[courseDocumentId]/lessons/[lessonDocumentId]">) {
  const { courseDocumentId, lessonDocumentId } = await params;
  const user = await requireRole([APP_ROLES.STUDENT]);
  const [learning, lesson, progress] = await Promise.all([
    getMyCourse(courseDocumentId),
    getStudentLesson(courseDocumentId, lessonDocumentId),
    getMyProgress(courseDocumentId),
  ]);
  if (!learning || !lesson || !progress) notFound();
  const steps = progress.steps ?? [];
  const currentIndex = steps.findIndex(
    (item) => item.kind === "lesson" && item.documentId === lessonDocumentId,
  );
  if (currentIndex < 0) notFound();
  const current = steps[currentIndex];
  const previous = steps[currentIndex - 1];
  const next = steps[currentIndex + 1];
  const completed = current.completed;
  const nextLocked = next?.locked ?? false;
  const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);

  return (
    <DashboardShell user={user}>
      <div className="lesson-workspace-heading">
        <div>
          <Link href={`/learn/${courseDocumentId}`}>← Course overview</Link>
          <p className="eyebrow">
            Lesson · step {currentIndex + 1} of {steps.length}
          </p>
          <h1>{lesson.title}</h1>
        </div>
        <ProgressMeter
          compact
          completed={progress.completedSteps}
          percentage={progress.percentage}
          total={progress.totalSteps}
        />
      </div>
      <div className="lesson-workspace">
        <article className="lesson-content-panel">
          {embedUrl ? (
            <div className="responsive-video lesson-video">
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                src={embedUrl}
                title={`${lesson.title} video`}
              />
            </div>
          ) : lesson.videoUrl ? (
            <a
              className="external-video-link"
              href={lesson.videoUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open lesson video in a new tab ↗
            </a>
          ) : null}
          {lesson.content && (
            <div className="lesson-copy">
              <span>Lesson notes</span>
              <p className="text-with-links">
                <TextWithLinks text={lesson.content} />
              </p>
            </div>
          )}
          <CompleteLessonButton
            completed={completed}
            courseDocumentId={courseDocumentId}
            lessonDocumentId={lessonDocumentId}
            nextHref={
              next ? learningStepHref(courseDocumentId, next) : null
            }
          />
          <nav className="lesson-pagination" aria-label="Lesson navigation">
            {previous ? (
              <Link href={learningStepHref(courseDocumentId, previous)}>
                ← {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next && !nextLocked ? (
              <Link href={learningStepHref(courseDocumentId, next)}>
                {next.title} →
              </Link>
            ) : next ? (
              <span className="locked-pagination">Complete this lesson to unlock the next step →</span>
            ) : (
              <Link href={`/learn/${courseDocumentId}`}>Finish course →</Link>
            )}
          </nav>
        </article>
        <aside className="lesson-outline">
          <p className="eyebrow">Course outline</p>
          <h2>{learning.course.title}</h2>
          <ol>
            {steps.map((item, index) => {
              const content = (
                <>
                  <span>{item.completed ? "✓" : item.locked ? "🔒" : item.kind === "quiz" ? "Q" : index + 1}</span>
                  {item.title}
                </>
              );
              return (
                <li
                  className={item.kind === "lesson" && item.documentId === lessonDocumentId ? "active" : ""}
                  key={`${item.kind}-${item.documentId}`}
                >
                  {item.locked ? (
                    <div className="locked-outline-lesson">{content}</div>
                  ) : (
                    <Link href={learningStepHref(courseDocumentId, item)}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </DashboardShell>
  );
}
