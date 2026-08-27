import "server-only";

import { strapiFetch } from "../strapi";
import type { BlogPost } from "../types";

export async function getPublishedBlogs() {
  try {
    const response = await strapiFetch("/api/lms/blog-posts", {
      cache: "no-store",
    });
    if (!response.ok) return [];
    return ((await response.json()) as { data: BlogPost[] }).data ?? [];
  } catch {
    return [];
  }
}

export async function getPublishedBlog(slug: string) {
  try {
    const response = await strapiFetch(
      `/api/lms/blog-posts/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return ((await response.json()) as { data: BlogPost }).data ?? null;
  } catch {
    return null;
  }
}
