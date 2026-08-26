import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="marketing-footer">
      <div className="footer-grid">
        <div className="footer-brand-column">
          <Link className="academy-brand light" href="/">
            <span className="academy-mark" aria-hidden="true">P</span>
            <span><strong>Project30</strong><small>ACADEMY</small></span>
          </Link>
          <p>বাংলায় practical skill learning—course, lesson, quiz এবং measurable progress এক জায়গায়।</p>
        </div>
        <div><strong>শিখুন</strong><Link href="/courses">সকল কোর্স</Link><Link href="/#free-class">ফ্রি ক্লাস</Link></div>
        <div><strong>প্ল্যাটফর্ম</strong><Link href="/login">লগ ইন</Link><Link href="/register">Student account</Link></div>
        <div><strong>তথ্য</strong><Link href="/media-credits">Media credits</Link><a href="/api/health">System health</a></div>
      </div>
      <div className="footer-bottom"><span>© 2026 Project30 Academy</span><span>Next.js · Strapi · PostgreSQL</span></div>
    </footer>
  );
}
