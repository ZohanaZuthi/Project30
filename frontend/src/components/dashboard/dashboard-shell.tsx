import Link from "next/link";
import type { ReactNode } from "react";

import { COURSE_MANAGER_ROLES } from "@/lib/auth/constants";
import type { CurrentUser } from "@/lib/types";

import { LogoutButton } from "./logout-button";

export function DashboardShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const canManageCourses = COURSE_MANAGER_ROLES.includes(user.role.type);

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/">
          <span className="brand-mark">P30</span>
          <span>Project30 LMS</span>
        </Link>
        <nav aria-label="Dashboard navigation">
          <Link href="/dashboard">Dashboard</Link>
          {canManageCourses && <Link href="/manage/courses">Manage courses</Link>}
          <LogoutButton />
        </nav>
      </header>
      <div className="app-content">{children}</div>
    </main>
  );
}
