import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = { title: "Media credits" };

const credits = [
  ["Coding course photograph", "Sora Shimazaki on Pexels", "https://www.pexels.com/photo/crop-faceless-developer-working-on-software-code-on-laptop-5926382/"],
  ["Remote product design photograph", "ThisIsEngineering on Pexels", "https://www.pexels.com/photo/person-using-gray-laptop-3861964/"],
  ["Online study photograph", "Polina Tankilevitch on Pexels", "https://www.pexels.com/photo/a-person-writing-on-the-notebook-4443182/"],
  ["Python course photograph", "Christina Morillo on Pexels", "https://www.pexels.com/photo/woman-programming-on-a-notebook-1181359/"],
  ["Hero online-learning photograph", "Artem Podrez on Pexels", "https://www.pexels.com/photo/young-student-with-notebook-attending-online-lesson-4492194/"],
] as const;

export default function MediaCreditsPage() {
  return <main className="marketing-page"><SiteHeader /><section className="credits-page"><span className="section-kicker">Attribution</span><h1>Media credits</h1><p>Course demo photography comes from Pexels and is marked free to use on each linked source page. Preview lessons are embedded from their public YouTube pages and remain owned by their respective creators.</p><div className="credits-list">{credits.map(([label, author, href]) => <a href={href} target="_blank" rel="noreferrer" key={href}><span>{label}</span><strong>{author}</strong><b>↗</b></a>)}</div><Link href="/">← Return home</Link></section><SiteFooter /></main>;
}
