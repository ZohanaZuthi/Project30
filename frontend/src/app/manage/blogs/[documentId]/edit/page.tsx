import { notFound } from "next/navigation";

import { BlogForm } from "@/components/blog/blog-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";
import { getManagedBlog } from "@/lib/dal/lms";

export default async function EditBlogPage({
  params,
}: PageProps<"/manage/blogs/[documentId]/edit">) {
  const { documentId } = await params;
  const user = await requireRole([APP_ROLES.ADMIN, APP_ROLES.CONTENT_MANAGER]);
  const post = await getManagedBlog(documentId);
  if (!post) notFound();
  return (
    <DashboardShell user={user}>
      <div className="editor-page">
        <div className="page-heading compact-heading">
          <div>
            <p className="eyebrow">Post editor</p>
            <h1>{post.title}</h1>
            <p>
              {post.publishedAt ? "Currently published" : "Private draft"} ·{" "}
              <code>{post.documentId}</code>
            </p>
          </div>
        </div>
        <BlogForm post={post} />
      </div>
    </DashboardShell>
  );
}
