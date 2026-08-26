import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CourseForm } from "@/components/dashboard/course-form";
import { COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";

export default async function NewCoursePage() {
  const user = await requireRole(COURSE_MANAGER_ROLES);
  return (
    <DashboardShell user={user}>
      <div className="editor-page">
        <div className="page-heading compact-heading">
          <div><p className="eyebrow">Content library</p><h1>Create a course</h1><p>Instructor ownership is assigned from the authenticated user on Strapi—not accepted from this form.</p></div>
        </div>
        <CourseForm />
      </div>
    </DashboardShell>
  );
}
