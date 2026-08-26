import type { Metadata } from "next";

import { CourseCatalog } from "@/components/marketing/course-catalog";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getPublishedCourses } from "@/lib/dal/public-courses";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const courses = await getPublishedCourses();
  return (
    <main className="marketing-page">
      <SiteHeader />
      <section className="catalog-page-hero"><span className="section-kicker">Course catalog</span><h1>ক্যারিয়ার গড়ার<br /><em>practical courses</em></h1><p>নিজের pace-এ শিখুন, quiz দিয়ে যাচাই করুন এবং প্রতিটি lesson-এর progress track করুন।</p></section>
      <CourseCatalog courses={courses} />
      <SiteFooter />
    </main>
  );
}
