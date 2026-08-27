import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CompleteLessonButton } from "@/components/learning/complete-lesson-button";
import { ProgressMeter } from "@/components/learning/progress-meter";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getMyCourse, getMyProgress, getStudentLesson } from "@/lib/dal/lms";
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
  const currentIndex = learning.course.lessons.findIndex(
    (item) => item.documentId === lessonDocumentId,
  );
  if (currentIndex < 0) notFound();
  const previous = learning.course.lessons[currentIndex - 1];
  const next = learning.course.lessons[currentIndex + 1];
  const completed =
    progress.lessons?.find((item) => item.documentId === lessonDocumentId)
      ?.completed ?? false;
  const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);

  return (
    <DashboardShell user={user}>
      <div className="lesson-workspace-heading">
        <div>
          <Link href={`/learn/${courseDocumentId}`}>← Course overview</Link>
          <p className="eyebrow">
            Lesson {currentIndex + 1} of {learning.course.lessons.length}
          </p>
          <h1>{lesson.title}</h1>
        </div>
        <ProgressMeter
          compact
          completed={progress.completedLessons}
          percentage={progress.percentage}
          total={progress.totalLessons}
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
              <p>{lesson.content}</p>
            </div>
          )}
          <CompleteLessonButton
            completed={completed}
            courseDocumentId={courseDocumentId}
            lessonDocumentId={lessonDocumentId}
            nextHref={
              next
                ? `/learn/${courseDocumentId}/lessons/${next.documentId}`
                : null
            }
          />
          <nav className="lesson-pagination" aria-label="Lesson navigation">
            {previous ? (
              <Link
                href={`/learn/${courseDocumentId}/lessons/${previous.documentId}`}
              >
                ← {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/learn/${courseDocumentId}/lessons/${next.documentId}`}
              >
                {next.title} →
              </Link>
            ) : (
              <Link href={`/learn/${courseDocumentId}`}>Finish course →</Link>
            )}
          </nav>
        </article>
        <aside className="lesson-outline">
          <p className="eyebrow">Course outline</p>
          <h2>{learning.course.title}</h2>
          <ol>
            {learning.course.lessons.map((item, index) => (
              <li
                className={item.documentId === lessonDocumentId ? "active" : ""}
                key={item.documentId}
              >
                <Link
                  href={`/learn/${courseDocumentId}/lessons/${item.documentId}`}
                >
                  <span>
                    {progress.lessons?.find(
                      (entry) => entry.documentId === item.documentId,
                    )?.completed
                      ? "✓"
                      : index + 1}
                  </span>
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </DashboardShell>
  );
}
