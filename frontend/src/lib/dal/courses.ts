import "server-only";

import { redirect } from "next/navigation";

import { getAccessToken } from "./auth";
import { strapiFetch } from "../strapi";
import type { Course, Lesson } from "../types";

async function managedRequest<T>(path: `/api/lms/manage/${string}`) {
  const token = await getAccessToken();
  if (!token) redirect("/login");

  const response = await strapiFetch(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/forbidden");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load course data from Strapi.");

  return (await response.json()) as { data: T };
}

export async function getManagedCourses() {
  const result = await managedRequest<Course[]>("/api/lms/manage/courses");
  return result?.data ?? [];
}

export async function getManagedCourse(documentId: string) {
  const result = await managedRequest<Course>(
    `/api/lms/manage/courses/${encodeURIComponent(documentId)}`,
  );
  return result?.data ?? null;
}

export async function getManagedLessons(documentId: string) {
  const result = await managedRequest<Lesson[]>(
    `/api/lms/manage/courses/${encodeURIComponent(documentId)}/lessons`,
  );
  return result?.data ?? [];
}
