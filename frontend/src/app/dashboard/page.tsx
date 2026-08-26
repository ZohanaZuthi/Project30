import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import { requireUser } from "@/lib/dal/auth";

const roleCopy = {
  admin: "You have platform-wide application access.",
  content_manager: "You can manage the content library across the platform.",
  instructor: "You can manage courses that are assigned to you.",
  student: "Your enrolled courses and learning progress will live here.",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const canManage = COURSE_MANAGER_ROLES.includes(user.role.type);

  return (
    <DashboardShell user={user}>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">{user.role.name} workspace</p>
          <h1>Hello, {user.username}.</h1>
          <p>{roleCopy[user.role.type]}</p>
        </div>
        <span className="role-badge">{user.role.type.replace("_", " ")}</span>
      </section>
      <section className="dashboard-grid">
        {canManage ? (
          <Link className="dashboard-card featured" href="/manage/courses">
            <span>Content library</span>
            <h2>Manage courses and lessons</h2>
            <p>Create drafts, publish courses, and maintain ordered lesson content.</p>
            <strong>Open course manager →</strong>
          </Link>
        ) : (
          <Link className="dashboard-card featured" href="/courses">
            <span>Learning</span>
            <h2>Explore available courses</h2>
            <p>Browse practical courses, preview the curriculum, and choose what to learn next.</p>
            <strong>Browse courses →</strong>
          </Link>
        )}
        <article className="dashboard-card">
          <span>Security boundary</span>
          <h2>Role checked by Strapi</h2>
          <p>The navigation reflects your role, but API policies make the final decision.</p>
        </article>
      </section>
    </DashboardShell>
  );
}
