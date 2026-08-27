import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSafeBlogImage } from "@/lib/course-presentation";
import { getPublishedBlogs } from "@/lib/dal/blogs";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogPage() {
  const posts = await getPublishedBlogs();
  return (
    <main className="marketing-page">
      <SiteHeader />
      <section className="blog-hero">
        <span className="section-kicker">Project30 journal</span>
        <h1>
          শেখা, career ও<br />
          <em>technology insights</em>
        </h1>
        <p>
          Practical guides from the people building and teaching at Project30
          Academy.
        </p>
      </section>
      {posts.length ? (
        <section className="public-blog-grid">
          {posts.map((post, index) => (
            <article key={post.documentId}>
              <Link className="public-blog-cover" href={`/blog/${post.slug}`}>
                <Image
                  alt={`${post.title} cover`}
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                  src={getSafeBlogImage(post.coverImageUrl, index)}
                />
              </Link>
              <div>
                <span>
                  {post.publishedAt
                    ? new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(post.publishedAt))
                    : "Published"}
                </span>
                <h2>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p>
                  {post.body.slice(0, 180)}
                  {post.body.length > 180 ? "…" : ""}
                </p>
                <Link href={`/blog/${post.slug}`}>Read article →</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="catalog-empty public-blog-empty">
          <strong>The first article is being prepared.</strong>
          <p>Published posts will appear here; drafts remain private.</p>
        </section>
      )}
      <SiteFooter />
    </main>
  );
}
