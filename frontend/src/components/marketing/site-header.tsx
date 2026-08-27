import Link from "next/link";

import { APP_ROLES } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/dal/auth";

export async function SiteHeader() {
  const user = await getCurrentUser().catch(() => null);
  const workspaceHref =
    user?.role.type === APP_ROLES.STUDENT ? "/learn" : "/dashboard";
  return (
    <>
      <div className="announcement-bar">
        <span>স্বাধীনভাবে শিখুন</span>
        <p>সব demo course এখন free enrollment</p>
        <Link href="/courses">কোর্স দেখুন →</Link>
      </div>
      <header className="marketing-header">
        <Link
          className="academy-brand"
          href="/"
          aria-label="Project30 Academy home"
        >
          <span className="academy-mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>Project30</strong>
            <small>ACADEMY</small>
          </span>
        </Link>
        <nav className="marketing-nav" aria-label="Main navigation">
          <Link href="/courses">কোর্সসমূহ</Link>
          <Link href="/blog">ব্লগ</Link>
          <Link href="/#why-us">কেন আমরা</Link>
          <Link href="/#free-class">ফ্রি ক্লাস</Link>
        </nav>
        <div className="marketing-auth-actions">
          {user ? (
            <>
              <Link className="nav-login" href="/dashboard">
                Hi, {user.username}
              </Link>
              <Link className="nav-join" href={workspaceHref}>
                {user.role.type === APP_ROLES.STUDENT
                  ? "শেখা চালিয়ে যান"
                  : "Workspace"}
              </Link>
            </>
          ) : (
            <>
              <Link className="nav-login" href="/login">
                লগ ইন
              </Link>
              <Link className="nav-join" href="/register">
                ফ্রি শুরু করুন
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}
