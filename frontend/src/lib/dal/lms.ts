import "server-only";

import { redirect } from "next/navigation";

import { strapiFetch } from "../strapi";
import type {
  AdminUser,
  BlogPost,
  CourseProgress,
  Enrollment,
  ManagedProgress,
  MyCourse,
  PlatformStats,
  PaginationMeta,
  Quiz,
  QuizAttempt,
  Lesson,
} from "../types";
import { getAccessToken } from "./auth";

async function authenticatedResponse<T>(path: `/api/lms/${string}`) {
  const token = await getAccessToken();
  if (!token)
    redirect(`/login?next=${encodeURIComponent(path.replace("/api/lms", ""))}`);

  const response = await strapiFetch(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/forbidden");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load LMS data from Strapi.");
  return (await response.json()) as { data: T; meta?: PaginationMeta };
}

async function authenticatedData<T>(path: `/api/lms/${string}`) {
  return (await authenticatedResponse<T>(path))?.data ?? null;
}

export async function getMyCourses() {
  return (await authenticatedData<Enrollment[]>("/api/lms/my-courses")) ?? [];
}

export async function getMyCourse(courseDocumentId: string) {
  return authenticatedData<MyCourse>(
    `/api/lms/my-courses/${encodeURIComponent(courseDocumentId)}`,
  );
}

export async function getMyProgress(courseDocumentId: string) {
  return authenticatedData<CourseProgress>(
    `/api/lms/my-courses/${encodeURIComponent(courseDocumentId)}/progress`,
  );
}

export async function getStudentLesson(
  courseDocumentId: string,
  lessonDocumentId: string,
) {
  return authenticatedData<Lesson>(
    `/api/lms/my-courses/${encodeURIComponent(courseDocumentId)}/lessons/${encodeURIComponent(lessonDocumentId)}`,
  );
}

export async function getStudentQuiz(
  courseDocumentId: string,
  quizDocumentId: string,
) {
  return authenticatedData<Quiz>(
    `/api/lms/my-courses/${encodeURIComponent(courseDocumentId)}/quizzes/${encodeURIComponent(quizDocumentId)}`,
  );
}

export async function getMyQuizAttempts() {
  return (
    (await authenticatedData<QuizAttempt[]>("/api/lms/my-quiz-attempts")) ?? []
  );
}

export async function getManagedQuizzes(courseDocumentId: string) {
  return (
    (await authenticatedData<Quiz[]>(
      `/api/lms/manage/courses/${encodeURIComponent(courseDocumentId)}/quizzes`,
    )) ?? []
  );
}

export async function getManagedProgress(courseDocumentId: string) {
  return (
    (await authenticatedData<ManagedProgress[]>(
      `/api/lms/manage/courses/${encodeURIComponent(courseDocumentId)}/progress`,
    )) ?? []
  );
}

export async function getManagedBlogs() {
  return (
    (await authenticatedData<BlogPost[]>("/api/lms/manage/blog-posts")) ?? []
  );
}

export async function getManagedBlog(documentId: string) {
  return authenticatedData<BlogPost>(
    `/api/lms/manage/blog-posts/${encodeURIComponent(documentId)}`,
  );
}

export async function getAdminUsers(page = 1, pageSize = 20) {
  const response = await authenticatedResponse<AdminUser[]>(
    `/api/lms/admin/users?page=${page}&pageSize=${pageSize}`,
  );
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? {
      page,
      pageSize,
      pageCount: 0,
      total: 0,
    },
  };
}

export async function getAllAdminUsers() {
  const firstPage = await getAdminUsers(1, 100);
  if (firstPage.meta.pageCount <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.pageCount - 1 }, (_, index) =>
      getAdminUsers(index + 2, 100),
    ),
  );

  return [firstPage.data, ...remainingPages.map(({ data }) => data)].flat();
}

export async function getPlatformStats() {
  return authenticatedData<PlatformStats>("/api/lms/admin/stats");
}
