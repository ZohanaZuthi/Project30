import { BlogForm } from "@/components/blog/blog-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { APP_ROLES } from "@/lib/auth/constants";
import { requireRole } from "@/lib/dal/auth";

export default async function NewBlogPage() {
  const user = await requireRole([APP_ROLES.ADMIN, APP_ROLES.CONTENT_MANAGER]);
  return (
    <DashboardShell user={user}>
      <div className="editor-page">
        <div className="page-heading compact-heading">
          <div>
            <p className="eyebrow">Publication desk</p>
            <h1>Write a post</h1>
            <p>Save privately as a draft or publish it to the public blog.</p>
          </div>
        </div>
        <BlogForm />
      </div>
    </DashboardShell>
  );
}
