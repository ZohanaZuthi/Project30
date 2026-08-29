import Image from "next/image";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { APP_ROLES } from "@/lib/auth/constants";
import { getSafeBlogImage } from "@/lib/course-presentation";
import { requireRole } from "@/lib/dal/auth";
import { getManagedBlogs } from "@/lib/dal/lms";

export default async function ManageBlogsPage() {
  const user = await requireRole([APP_ROLES.ADMIN, APP_ROLES.CONTENT_MANAGER]);
  const posts = await getManagedBlogs();
  return (
    <DashboardShell user={user}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Publication desk</p>
          <h1>Blog posts</h1>
          <p>
            {user.role.type === APP_ROLES.ADMIN
              ? "Admin can manage every author’s posts."
              : "You can manage posts authored by your account."}
          </p>
        </div>
        <Link className="button primary" href="/manage/blogs/new">
          Write a post
        </Link>
      </div>
      {posts.length ? (
        <div className="managed-blog-grid">
          {posts.map((post, index) => (
            <article key={post.documentId}>
              <Link
                aria-label={`Edit ${post.title}`}
                className="managed-blog-card-link"
                href={`/manage/blogs/${post.documentId}/edit`}
              >
                <div className="managed-blog-cover">
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                    src={getSafeBlogImage(post.coverImageUrl, index)}
                  />
                  <span
                    className={
                      post.publishedAt ? "status published" : "status draft"
                    }
                  >
                    {post.publishedAt ? "Published" : "Draft"}
                  </span>
                </div>
                <div>
                  <small>By {post.author?.username ?? "Project30 team"}</small>
                  <h2>{post.title}</h2>
                  <p>
                    {post.body.slice(0, 130)}
                    {post.body.length > 130 ? "…" : ""}
                  </p>
                  <span className="managed-blog-edit-label">Edit post →</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-panel">
          <h2>No posts in your workspace</h2>
          <p>
            Create a draft, then publish it when it is ready for the public
            blog.
          </p>
          <Link className="button primary" href="/manage/blogs/new">
            Write the first post
          </Link>
        </section>
      )}
    </DashboardShell>
  );
}
