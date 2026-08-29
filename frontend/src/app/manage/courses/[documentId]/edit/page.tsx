import { notFound } from "next/navigation";

import { CourseForm } from "@/components/dashboard/course-form";
import { CurriculumManager } from "@/components/dashboard/curriculum-manager";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DeleteCourseButton } from "@/components/dashboard/delete-course-button";
import { CourseProgressPanel } from "@/components/dashboard/course-progress-panel";
import { APP_ROLES, COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getManagedCourse, getManagedLessons } from "@/lib/dal/courses";
import {
  getAllAdminUsers,
  getManagedProgress,
  getManagedQuizzes,
} from "@/lib/dal/lms";

export default async function EditCoursePage({
  params,
}: PageProps<"/manage/courses/[documentId]/edit">) {
  const { documentId } = await params;
  const user = await requireRole(COURSE_MANAGER_ROLES);
  const [course, lessons, quizzes, progress] = await Promise.all([
    getManagedCourse(documentId),
    getManagedLessons(documentId),
    getManagedQuizzes(documentId),
    getManagedProgress(documentId),
  ]);
  if (!course) notFound();
  const instructors =
    user.role.type === APP_ROLES.ADMIN
      ? (await getAllAdminUsers()).filter(
          (candidate) => candidate.role?.type === APP_ROLES.INSTRUCTOR,
        )
      : [];

  return (
    <DashboardShell user={user}>
      <div className="editor-page">
        <div className="page-heading compact-heading">
          <div>
            <p className="eyebrow">Course editor</p>
            <h1>{course.title}</h1>
            <p>
              Stable Strapi document ID: <code>{course.documentId}</code>
            </p>
          </div>
          <DeleteCourseButton documentId={course.documentId} />
        </div>
        <CourseForm course={course} instructors={instructors} />
        <CurriculumManager
          courseDocumentId={course.documentId}
          initialLessons={lessons}
          initialQuizzes={quizzes}
        />
        <CourseProgressPanel records={progress} />
      </div>
    </DashboardShell>
  );
}
