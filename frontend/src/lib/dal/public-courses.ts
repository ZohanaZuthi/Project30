import "server-only";

import { strapiFetch } from "../strapi";
import type { Course } from "../types";

export async function getPublishedCourses() {
  try {
    const response = await strapiFetch("/api/lms/courses", {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const result = (await response.json()) as { data?: Course[] };
    return result.data ?? [];
  } catch {
    return [];
  }
}

export async function getPublishedCourse(documentId: string) {
  try {
    const response = await strapiFetch(
      `/api/lms/courses/${encodeURIComponent(documentId)}`,
      { cache: "no-store" },
    );
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const result = (await response.json()) as { data?: Course };
    return result.data ?? null;
  } catch {
    return null;
  }
}
