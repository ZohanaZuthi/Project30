import { notFound } from "next/navigation";

import { CourseForm } from "@/components/dashboard/course-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DeleteCourseButton } from "@/components/dashboard/delete-course-button";
import { LessonManager } from "@/components/dashboard/lesson-manager";
import { COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getManagedCourse, getManagedLessons } from "@/lib/dal/courses";

export default async function EditCoursePage({
  params,
}: PageProps<"/manage/courses/[documentId]/edit">) {
  const { documentId } = await params;
  const user = await requireRole(COURSE_MANAGER_ROLES);
  const [course, lessons] = await Promise.all([
    getManagedCourse(documentId),
    getManagedLessons(documentId),
  ]);
  if (!course) notFound();

  return (
    <DashboardShell user={user}>
      <div className="editor-page">
        <div className="page-heading compact-heading">
          <div><p className="eyebrow">Course editor</p><h1>{course.title}</h1><p>Stable Strapi document ID: <code>{course.documentId}</code></p></div>
          <DeleteCourseButton documentId={course.documentId} />
        </div>
        <CourseForm course={course} />
        <LessonManager courseDocumentId={course.documentId} initialLessons={lessons} />
      </div>
    </DashboardShell>
  );
}
