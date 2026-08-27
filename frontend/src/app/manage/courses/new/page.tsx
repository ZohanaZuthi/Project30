import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CourseForm } from "@/components/dashboard/course-form";
import { APP_ROLES, COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getAdminUsers } from "@/lib/dal/lms";

export default async function NewCoursePage() {
  const user = await requireRole(COURSE_MANAGER_ROLES);
  const instructors =
    user.role.type === APP_ROLES.ADMIN
      ? (await getAdminUsers()).filter(
          (candidate) => candidate.role?.type === APP_ROLES.INSTRUCTOR,
        )
      : [];
  return (
    <DashboardShell user={user}>
      <div className="editor-page">
        <div className="page-heading compact-heading">
          <div>
            <p className="eyebrow">Content library</p>
            <h1>Create a course</h1>
            <p>
              Instructor ownership is assigned from the authenticated user on
              Strapi—not accepted from this form.
            </p>
          </div>
        </div>
        <CourseForm instructors={instructors} />
      </div>
    </DashboardShell>
  );
}
