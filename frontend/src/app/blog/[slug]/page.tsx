import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSafeBlogImage } from "@/lib/course-presentation";
import { getPublishedBlog } from "@/lib/dal/blogs";

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlog(slug);
  return {
    title: post?.title ?? "Article",
    description: post?.body.slice(0, 150),
  };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedBlog(slug);
  if (!post) notFound();
  return (
    <main className="marketing-page">
      <SiteHeader />
      <article className="article-page">
        <header>
          <Link href="/blog">← সব লেখা</Link>
          <span className="section-kicker">Project30 journal</span>
          <h1>{post.title}</h1>
          <div>
            <span>By {post.author?.username ?? "Project30 team"}</span>
            <span>
              {post.publishedAt
                ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
                    new Date(post.publishedAt),
                  )
                : ""}
            </span>
          </div>
        </header>
        <div className="article-cover">
          <Image
            alt={`${post.title} cover`}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 1000px"
            src={getSafeBlogImage(post.coverImageUrl)}
          />
        </div>
        <div className="article-body">
          {post.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
