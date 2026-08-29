import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TextWithLinks } from "@/components/content/text-with-links";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { EnrollButton } from "@/components/learning/enroll-button";
import { APP_ROLES } from "@/lib/auth/constants";
import { getCoursePresentation } from "@/lib/course-presentation";
import { getCurrentUser } from "@/lib/dal/auth";
import { getMyCourses } from "@/lib/dal/lms";
import { getPublishedCourse } from "@/lib/dal/public-courses";

export async function generateMetadata({
  params,
}: PageProps<"/courses/[documentId]">): Promise<Metadata> {
  const { documentId } = await params;
  const course = await getPublishedCourse(documentId);
  return { title: course?.title ?? "Course" };
}

export default async function CourseDetailPage({
  params,
}: PageProps<"/courses/[documentId]">) {
  const { documentId } = await params;
  const [course, user] = await Promise.all([
    getPublishedCourse(documentId),
    getCurrentUser(),
  ]);
  if (!course) notFound();
  const view = getCoursePresentation(course);
  const courseSteps = [
    ...course.lessons.map((lesson) => ({ ...lesson, kind: "lesson" as const })),
    ...course.quizzes.map((quiz) => ({ ...quiz, kind: "quiz" as const })),
  ].sort((a, b) => a.position - b.position);
  const enrollment =
    user?.role?.type === APP_ROLES.STUDENT
      ? (await getMyCourses()).find(
          (item) => item.course.documentId === documentId,
        )
      : null;

  return (
    <main className="marketing-page">
      <SiteHeader />
      <section className="course-detail-hero">
        <div className="course-detail-copy">
          <Link href="/courses">← সব কোর্স</Link>
          <span className="course-detail-category">{view.category}</span>
          <h1>{course.title}</h1>
          <p className="text-with-links">
            <TextWithLinks text={course.description} />
          </p>
          <div className="detail-rating">
            <strong>★ {view.rating}</strong>
            <span>{view.learners} learners</span>
            <span>{courseSteps.length} learning steps</span>
            <span>{view.duration}</span>
          </div>
          <div className="detail-mentor">
            <i>P30</i>
            <div>
              <small>Course instructor</small>
              <strong>
                {course.instructor?.username ?? "Project30 Mentor Team"}
              </strong>
            </div>
          </div>
        </div>
        <aside className="enrollment-card">
          <div className="enrollment-image">
            <Image
              src={view.image}
              alt={`${course.title} course cover`}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 38vw"
            />
            <span>▶ Preview</span>
          </div>
          <div className="enrollment-body">
            <small>Full course access</small>
            <div className="enrollment-price">
              Free <del>৳2,500</del>
            </div>
            <ul>
              <li>✓ {course.lessons.length} structured lessons</li>
              <li>
                ✓ {course.quizzes.length} auto-graded quiz step
                {course.quizzes.length === 1 ? "" : "s"}
              </li>
              <li>✓ Persistent progress tracking</li>
              <li>✓ Learn on any device</li>
            </ul>
            {enrollment ? (
              <Link href={`/learn/${documentId}`}>শেখা চালিয়ে যান →</Link>
            ) : user?.role?.type === APP_ROLES.STUDENT ? (
              <EnrollButton courseDocumentId={documentId} />
            ) : user && !user.role ? (
              <Link href="/no-role">Check your account status →</Link>
            ) : user ? (
              <Link href="/dashboard">Open your workspace →</Link>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/courses/${documentId}`)}`}
              >
                Log in to enroll →
              </Link>
            )}
            <p>এই demo course-এর জন্য কোনো payment প্রয়োজন নেই।</p>
          </div>
        </aside>
      </section>
      <section className="course-detail-content">
        <div className="curriculum-panel">
          <span className="section-kicker">Course curriculum</span>
          <h2>যা যা শিখবেন</h2>
          <ol>
            {courseSteps.map((step, index) => (
              <li key={`${step.kind}-${step.documentId}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>
                    {step.kind === "quiz"
                      ? "Auto-graded quiz · result saved"
                      : index === 0
                        ? "Video + lesson notes"
                        : "Lesson notes + resources"}
                  </small>
                </div>
                <b>
                  {step.kind === "quiz"
                    ? "Quiz"
                    : index === 0
                      ? "Preview"
                      : "Locked"}
                </b>
              </li>
            ))}
          </ol>
        </div>
        <div className="detail-preview">
          <span className="section-kicker">Preview lesson</span>
          <h2>শুরু করার আগে দেখে নিন</h2>
          <div className="responsive-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${view.previewVideoId}?rel=0`}
              title={`${course.title} preview lesson`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
