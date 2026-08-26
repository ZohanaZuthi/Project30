import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      <div className="announcement-bar">
        <span>স্বাধীনভাবে শিখুন</span>
        <p>সব demo course এখন free enrollment</p>
        <Link href="/courses">কোর্স দেখুন →</Link>
      </div>
      <header className="marketing-header">
        <Link className="academy-brand" href="/" aria-label="Project30 Academy home">
          <span className="academy-mark" aria-hidden="true">P</span>
          <span>
            <strong>Project30</strong>
            <small>ACADEMY</small>
          </span>
        </Link>
        <nav className="marketing-nav" aria-label="Main navigation">
          <Link href="/courses">কোর্সসমূহ</Link>
          <Link href="/#why-us">কেন আমরা</Link>
          <Link href="/#free-class">ফ্রি ক্লাস</Link>
        </nav>
        <div className="marketing-auth-actions">
          <Link className="nav-login" href="/login">লগ ইন</Link>
          <Link className="nav-join" href="/register">ফ্রি শুরু করুন</Link>
        </div>
      </header>
    </>
  );
}
