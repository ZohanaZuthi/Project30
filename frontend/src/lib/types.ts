import type { AppRole } from "./auth/constants";

export type CurrentUser = {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  role: {
    name: string;
    type: AppRole;
  } | null;
};

export type AssignedUser = CurrentUser & {
  role: NonNullable<CurrentUser["role"]>;
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
  quizzes: Array<{ documentId: string; title: string; position: number }>;
};

export type ProgressStep = Pick<Lesson, "documentId" | "title" | "position"> & {
  kind: "lesson" | "quiz";
  completed: boolean;
  completedAt: string | null;
  locked: boolean;
};

export type ProgressLesson = ProgressStep & { kind: "lesson" };
export type ProgressQuiz = ProgressStep & { kind: "quiz" };

export type CourseProgress = {
  totalSteps: number;
  completedSteps: number;
  totalLessons: number;
  completedLessons: number;
  totalQuizzes: number;
  completedQuizzes: number;
  percentage: number;
  steps: ProgressStep[];
  lessons?: ProgressLesson[];
  quizzes?: ProgressQuiz[];
};

export type Enrollment = {
  enrollmentDocumentId: string;
  enrolledAt: string;
  course: Course;
  progress: CourseProgress;
};

export type MyCourse = {
  course: Course;
  progress: CourseProgress;
};

export type QuizQuestion = {
  prompt: string;
  options: string[];
  correctOption?: number;
};

export type Quiz = {
  documentId: string;
  title: string;
  position: number;
  questions: QuizQuestion[];
};

export type QuizResult = {
  documentId: string;
  quizDocumentId: string;
  submittedAt: string;
  answers: Array<number | null>;
  score: number;
  total: number;
  percentage: number;
};

export type QuizAttempt = Omit<QuizResult, "quizDocumentId"> & {
  quiz: {
    documentId: string;
    title: string;
    course: { documentId: string; title: string } | null;
  } | null;
};

export type ManagedProgress = {
  student: {
    id: number;
    documentId: string;
    username: string;
    email: string;
  };
  progress: CourseProgress;
};

export type BlogPost = {
  documentId: string;
  title: string;
  slug: string;
  body: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  author: { documentId?: string; username: string } | null;
};

export type AdminUser = {
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt?: string;
  role: { name: string; type: AppRole } | null;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type PlatformStats = {
  usersByRole: Partial<Record<AppRole | "unassigned", number>>;
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalEnrollments: number;
  totalQuizzes: number;
  totalQuizAttempts: number;
  publishedBlogPosts: number;
};
