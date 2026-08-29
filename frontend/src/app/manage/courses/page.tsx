import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getManagedCourses } from "@/lib/dal/courses";

export default async function ManageCoursesPage() {
  const user = await requireRole(COURSE_MANAGER_ROLES);
  const courses = await getManagedCourses();

  return (
    <DashboardShell user={user}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Content library</p>
          <h1>Courses</h1>
          <p>{user.role.type === "instructor" ? "Only courses owned by you are returned by Strapi." : "Your role can manage courses across the platform."}</p>
        </div>
        <Link className="button primary" href="/manage/courses/new">Create course</Link>
      </div>
      {courses.length > 0 ? (
        <div className="course-grid">
          {courses.map((course) => (
            <Link className="course-card" href={`/manage/courses/${course.documentId}/edit`} key={course.documentId}>
              <div className="course-card-top">
                <span className={course.publishedAt ? "status published" : "status draft"}>
                  {course.publishedAt ? "Published" : "Draft"}
                </span>
                <span>{course.lessons.length + course.quizzes.length} course steps</span>
              </div>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <strong>Edit course →</strong>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <h2>No courses in your workspace</h2>
          <p>Create one to verify the role and ownership flow end to end.</p>
        </div>
      )}
    </DashboardShell>
  );
}
