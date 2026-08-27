import Link from "next/link";

import { UserManager } from "@/components/admin/user-manager";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getManagedCourses } from "@/lib/dal/courses";
import {
  getAdminUsers,
  getManagedBlogs,
  getPlatformStats,
} from "@/lib/dal/lms";

export default async function AdminPage() {
  const user = await requireRole([APP_ROLES.ADMIN]);
  const [stats, users, courses, posts] = await Promise.all([
    getPlatformStats(),
    getAdminUsers(),
    getManagedCourses(),
    getManagedBlogs(),
  ]);
  if (!stats) throw new Error("Platform statistics are unavailable.");
  const statCards = [
    [
      "Total users",
      stats.totalUsers,
      `${stats.usersByRole.student ?? 0} students`,
    ],
    ["Courses", stats.totalCourses, `${stats.totalLessons} lessons`],
    ["Enrollments", stats.totalEnrollments, "Across all courses"],
    ["Quiz attempts", stats.totalQuizAttempts, `${stats.totalQuizzes} quizzes`],
    ["Published posts", stats.publishedBlogPosts, "Publicly readable"],
  ] as const;
  return (
    <DashboardShell user={user}>
      <div className="admin-hero">
        <div>
          <p className="eyebrow">Platform administration</p>
          <h1>Control center</h1>
          <p>A live overview of users, learning content, and activity.</p>
        </div>
        <span>Admin only</span>
      </div>
      <section className="admin-stat-grid">
        {statCards.map(([label, value, note]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="role-stat-strip">
        {(
          [
            APP_ROLES.ADMIN,
            APP_ROLES.CONTENT_MANAGER,
            APP_ROLES.INSTRUCTOR,
            APP_ROLES.STUDENT,
          ] as const
        ).map((role) => (
          <div key={role}>
            <span>{role.replace("_", " ")}</span>
            <strong>{stats.usersByRole[role] ?? 0}</strong>
          </div>
        ))}
      </section>
      <UserManager actorDocumentId={user.documentId} initialUsers={users} />
      <div className="admin-content-grid">
        <section>
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Content library</p>
              <h2>All courses</h2>
            </div>
            <Link href="/manage/courses">Manage all →</Link>
          </div>
          {courses.slice(0, 5).map((course) => (
            <Link
              className="admin-content-row"
              href={`/manage/courses/${course.documentId}/edit`}
              key={course.documentId}
            >
              <div>
                <strong>{course.title}</strong>
                <small>
                  {course.lessons.length} lessons ·{" "}
                  {course.instructor?.username ?? "Unassigned"}
                </small>
              </div>
              <span
                className={
                  course.publishedAt ? "status published" : "status draft"
                }
              >
                {course.publishedAt ? "Published" : "Draft"}
              </span>
            </Link>
          ))}
        </section>
        <section>
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Editorial</p>
              <h2>All blog posts</h2>
            </div>
            <Link href="/manage/blogs">Manage all →</Link>
          </div>
          {posts.slice(0, 5).map((post) => (
            <Link
              className="admin-content-row"
              href={`/manage/blogs/${post.documentId}/edit`}
              key={post.documentId}
            >
              <div>
                <strong>{post.title}</strong>
                <small>By {post.author?.username ?? "Unknown"}</small>
              </div>
              <span
                className={
                  post.publishedAt ? "status published" : "status draft"
                }
              >
                {post.publishedAt ? "Published" : "Draft"}
              </span>
            </Link>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}
