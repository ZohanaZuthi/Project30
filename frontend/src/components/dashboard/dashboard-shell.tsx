import Link from "next/link";
import type { ReactNode } from "react";

import { APP_ROLES, COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import type { AssignedUser } from "@/lib/types";

import { LogoutButton } from "./logout-button";

export function DashboardShell({
  user,
  children,
}: {
  user: AssignedUser;
  children: ReactNode;
}) {
  const canManageCourses = COURSE_MANAGER_ROLES.includes(user.role.type);
  const canManageBlogs =
    user.role.type === APP_ROLES.ADMIN ||
    user.role.type === APP_ROLES.CONTENT_MANAGER;
  const isStudent = user.role.type === APP_ROLES.STUDENT;
  const isAdmin = user.role.type === APP_ROLES.ADMIN;

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/">
          <span className="brand-mark">P30</span>
          <span>Project30 Academy</span>
        </Link>
        <nav aria-label="Dashboard navigation">
          <Link href="/dashboard">Dashboard</Link>
          {isStudent && <Link href="/learn">My courses</Link>}
          {isStudent && <Link href="/quiz-attempts">Results</Link>}
          {canManageCourses && (
            <Link href="/manage/courses">Manage courses</Link>
          )}
          {canManageBlogs && <Link href="/manage/blogs">Manage blog</Link>}
          {isAdmin && <Link href="/admin">Admin</Link>}
          <LogoutButton />
        </nav>
      </header>
      <div className="app-content">{children}</div>
    </main>
  );
}
