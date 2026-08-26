import type { AppRole } from "./auth/constants";

export type CurrentUser = {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  role: {
    name: string;
    type: AppRole;
  };
};

export type Lesson = {
  documentId: string;
  title: string;
  content: string;
  videoUrl: string | null;
  position: number;
};

export type Course = {
  documentId: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  instructor: { documentId?: string; username: string } | null;
  lessons: Array<Pick<Lesson, "documentId" | "title" | "position">>;
};
