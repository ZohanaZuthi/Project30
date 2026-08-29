import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { CourseCard } from "@/components/marketing/course-card";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { APP_ROLES } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/dal/auth";
import { getMyCourses } from "@/lib/dal/lms";
import { getPublishedCourses } from "@/lib/dal/public-courses";
import { summarizeStudentLearning } from "@/lib/student-learning";

const categories = [
  ["⌘", "Web Development", "Build modern products"],
  ["◈", "Product Design", "Design useful experiences"],
  ["↗", "Digital Marketing", "Grow with real data"],
  ["⌁", "Data & Analytics", "Turn data into decisions"],
] as const;

const outcomes = [
  ["01", "Structured learning", "Ordered lessons keep every learner on a clear path from foundations to a finished project."],
  ["02", "Practice that proves skill", "Quizzes are graded instantly by the backend and every result remains available later."],
  ["03", "Progress you can see", "Lesson completion is saved per student, per course—accurate across devices and refreshes."],
] as const;

export default async function Home() {
  const [publishedCourses, user] = await Promise.all([
    getPublishedCourses(),
    getCurrentUser().catch(() => null),
  ]);
  const courses = publishedCourses.slice(0, 4);
  const enrollments =
    user?.role?.type === APP_ROLES.STUDENT ? await getMyCourses() : [];
  const learning = summarizeStudentLearning(enrollments);
  const isStudent = user?.role?.type === APP_ROLES.STUDENT;
  const nextHref = learning.nextCourse?.href;
  const homeAction = isStudent
    ? learning.nextCourse?.nextLesson
      ? {
          label: "NEXT LESSON",
          title: learning.nextCourse.nextLesson.title,
          detail: learning.nextCourse.enrollment.course.title,
          href: nextHref ?? "/learn",
        }
      : enrollments.length > 0
        ? {
            label: "LEARNING LIBRARY",
            title: "You are all caught up",
            detail: "Review a course or take a quiz",
            href: "/learn",
          }
        : {
            label: "START HERE",
            title: "Choose your first course",
            detail: "Your account currently has zero progress",
            href: "/courses",
          }
    : user
      ? {
          label: "STAFF WORKSPACE",
          title: "Manage the learning platform",
          detail: user.role?.name ?? "Account access pending",
          href: user.role ? "/dashboard" : "/no-role",
        }
      : {
          label: "START FREE",
          title: "Choose your first course",
          detail: "Create an account to save your progress",
          href: "/register",
        };
  const homeProgress = isStudent ? learning.percentage : 0;
  const finalAction = isStudent
    ? learning.nextCourse
      ? {
          kicker: "শেখা চালিয়ে যান",
          title: "আপনার পরবর্তী lesson\nপ্রস্তুত আছে।",
          detail: `${learning.nextCourse.enrollment.course.title}—যেখান থেকে থেমেছিলেন, সেখান থেকেই শুরু করুন।`,
          href: learning.nextCourse.href,
          label: "পরবর্তী lesson-এ যান →",
        }
      : {
          kicker: "আপনার learning space",
          title: "নতুন কিছু\nশেখার সময়।",
          detail: "নিজের course review করুন অথবা নতুন একটি practical course বেছে নিন।",
          href: "/learn",
          label: "আমার কোর্স দেখুন →",
        }
    : user
      ? {
          kicker: "আপনার workspace",
          title: "Platform-এর কাজ\nএগিয়ে নিন।",
          detail: "নিজের role অনুযায়ী course, content অথবা platform পরিচালনা করুন।",
          href: user.role ? "/dashboard" : "/no-role",
          label: "Workspace খুলুন →",
        }
      : {
          kicker: "আজই শেখা শুরু করুন",
          title: "আপনার পরবর্তী skill\nমাত্র এক ক্লিক দূরে।",
          detail: "Free Student account খুলুন এবং নিজের progress track করুন।",
          href: "/register",
          label: "ফ্রি account তৈরি করুন →",
        };

  return (
    <main className="marketing-page">
      <SiteHeader />

      <section className="academy-hero">
        <div className="academy-hero-copy">
          <span className="hero-kicker"><i /> বাংলাদেশে practical skill learning</span>
          <h1>স্কিল শিখুন।<br /><em>নিজের ভবিষ্যৎ</em> তৈরি করুন।</h1>
          <p>বাংলায় project-based course, mentor-designed lesson, instant quiz feedback এবং measurable progress—সব এক জায়গায়।</p>
          <div className="academy-hero-actions">
            <Link className="academy-primary" href="/courses">কোর্স খুঁজুন <span>→</span></Link>
            <Link className="academy-secondary" href="#free-class"><span>▶</span> ফ্রি ক্লাস দেখুন</Link>
          </div>
          <div className="hero-trust-row">
            <div><strong>4.9/5</strong><span>learner rating</span></div>
            <div><strong>100%</strong><span>backend-verified progress</span></div>
            <div><strong>4 roles</strong><span>secure workspaces</span></div>
          </div>
        </div>
        <div className="academy-hero-visual">
          <div className="hero-photo-frame">
            <Image
              src="https://images.pexels.com/photos/4492194/pexels-photo-4492194.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="Student attending an online lesson and taking notes"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 48vw"
            />
          </div>
          <Link className="floating-live-card" href={homeAction.href}>
            <span>{homeAction.label}</span>
            <strong>{homeAction.title}</strong>
            <small>{homeAction.detail}</small>
          </Link>
          <Link
            className="floating-progress-card"
            href={isStudent ? "/dashboard" : homeAction.href}
          >
            <div>
              <span>{isStudent ? "Your overall progress" : "Progress tracking"}</span>
              <strong>{isStudent ? `${homeProgress}%` : "Ready"}</strong>
            </div>
            <i>
              <b
                style={
                  { "--home-progress": `${homeProgress}%` } as CSSProperties
                }
              />
            </i>
            <small>
              {isStudent
                ? `${learning.completedLessons} of ${learning.totalLessons} lessons complete`
                : "Begins at 0% after your first enrollment"}
            </small>
          </Link>
        </div>
      </section>

      <section className="academy-stats" aria-label="Platform statistics">
        <div><strong>12k+</strong><span>learning sessions</span></div>
        <div><strong>96%</strong><span>course satisfaction</span></div>
        <div><strong>24/7</strong><span>lesson access</span></div>
        <div><strong>Instant</strong><span>quiz feedback</span></div>
      </section>

      <section className="marketing-section category-section">
        <div className="marketing-section-heading"><div><span className="section-kicker">Explore by category</span><h2>আপনার লক্ষ্য অনুযায়ী<br />শেখা শুরু করুন</h2></div><Link href="/courses">সব ক্যাটাগরি →</Link></div>
        <div className="category-grid">
          {categories.map(([icon, title, description]) => (
            <Link className="category-card" href="/courses" key={title}>
              <span>{icon}</span><div><strong>{title}</strong><small>{description}</small></div><b>↗</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="marketing-section popular-section" id="courses">
        <div className="marketing-section-heading"><div><span className="section-kicker">Popular courses</span><h2>এই সপ্তাহের সেরা কোর্স</h2><p>Local learners-এর জন্য practical, project-focused learning paths.</p></div><Link href="/courses">সকল কোর্স দেখুন →</Link></div>
        {courses.length > 0 ? (
          <div className="catalog-grid">{courses.map((course, index) => <CourseCard course={course} index={index} key={course.documentId} />)}</div>
        ) : (
          <div className="catalog-empty"><strong>Course catalog is getting ready.</strong><p>Start Strapi and run <code>npm run seed:demo</code> to load the local demo catalog.</p></div>
        )}
      </section>

      <section className="free-class-section" id="free-class">
        <div className="free-class-copy"><span className="section-kicker light">Free preview class</span><h2>ক্লাসের মান নিজেই যাচাই করুন</h2><p>Next.js App Router-এর এই Bangla preview lesson দিয়ে দেখুন video-based learning experience কেমন হবে।</p><ul><li>✓ Responsive embedded player</li><li>✓ Real lesson URLs stored in Strapi</li><li>✓ Enrollment-gated full curriculum</li></ul><Link href="/courses">Full course দেখুন →</Link></div>
        <div className="video-shell"><div className="video-topbar"><span><i /> Free class</span><small>Project30 Academy</small></div><div className="responsive-video"><iframe src="https://www.youtube-nocookie.com/embed/NgrljB7UU34?rel=0" title="Next.js Bangla free preview class" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>
      </section>

      <section className="marketing-section why-section" id="why-us">
        <div className="why-intro"><span className="section-kicker">Why Project30</span><h2>শুধু ভিডিও নয়—একটি complete learning loop</h2><p>Every visual promise is backed by a real Strapi workflow and persistent PostgreSQL data.</p></div>
        <div className="outcome-list">{outcomes.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
      </section>

      <section className="final-cta">
        <span>{finalAction.kicker}</span>
        <h2>
          {finalAction.title.split("\n").map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </h2>
        <p>{finalAction.detail}</p>
        <Link href={finalAction.href}>{finalAction.label}</Link>
      </section>
      <SiteFooter />
    </main>
  );
}
