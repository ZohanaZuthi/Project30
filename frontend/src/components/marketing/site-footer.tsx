import Link from "next/link";

import { APP_ROLES } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/dal/auth";

export async function SiteFooter() {
  const user = await getCurrentUser().catch(() => null);
  const workspaceHref = user?.role ? "/dashboard" : "/no-role";

  return (
    <footer className="marketing-footer">
      <div className="footer-grid">
        <div className="footer-brand-column">
          <Link className="academy-brand light" href="/">
            <span className="academy-mark" aria-hidden="true">
              P
            </span>
            <span>
              <strong>Project30</strong>
              <small>ACADEMY</small>
            </span>
          </Link>
          <p>
            বাংলায় practical skill learning—course, lesson, quiz এবং measurable
            progress এক জায়গায়।
          </p>
        </div>
        <div>
          <strong>শিখুন</strong>
          <Link href="/courses">সকল কোর্স</Link>
          <Link href="/blog">ব্লগ</Link>
          <Link href="/#free-class">ফ্রি ক্লাস</Link>
        </div>
        <div>
          <strong>{user ? "আপনার অ্যাকাউন্ট" : "শুরু করুন"}</strong>
          {user ? (
            <>
              <Link href={workspaceHref}>{user.username}</Link>
              <Link href={workspaceHref}>ড্যাশবোর্ড</Link>
              {user.role?.type === APP_ROLES.STUDENT && (
                <Link href="/learn">আমার কোর্স</Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login">লগ ইন করুন</Link>
              <Link href="/register">ফ্রি Student account খুলুন</Link>
            </>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Project30 Academy</span>
        <span>নিজের গতিতে শিখুন · অগ্রগতি ধরে রাখুন</span>
      </div>
    </footer>
  );
}
