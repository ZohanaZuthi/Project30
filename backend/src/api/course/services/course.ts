import { randomUUID } from "node:crypto";

import { factories } from "@strapi/strapi";
import type { Modules } from "@strapi/types";
import { errors } from "@strapi/utils";

import {
  APP_ROLES,
  getRoleType,
  type ApplicationUser,
} from "../../../utils/authorization";
import type {
  courseCreateSchema,
  courseUpdateSchema,
} from "../../../utils/validation";
import type { z } from "zod";

type CourseCreateInput = z.infer<typeof courseCreateSchema>;
type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;

type InstructorSummary = {
  id?: number;
  documentId?: string;
  username?: string;
} | null;

type CourseDocument = {
  documentId: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
  instructor?: InstructorSummary;
  lessons?: Array<{ documentId: string; title: string; position: number }>;
};

type PublicationDocument = {
  documentId: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

const { ValidationError } = errors;

function publicationDate(value: unknown) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function publicationDateFor(document: PublicationDocument | null | undefined) {
  if (!document) return null;
  // A status-filtered Document Service lookup is the source of truth. Some
  // database adapters omit lifecycle timestamps from this projection even
  // when requested, so retain a truthful non-null publication marker.
  return (
    publicationDate(document.publishedAt ?? document.updatedAt) ??
    new Date().toISOString()
  );
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return `${base || "course"}-${randomUUID().slice(0, 8)}`;
}

function courseDto(course: CourseDocument) {
  return {
    documentId: course.documentId,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl ?? null,
    publishedAt: course.publishedAt ?? null,
    instructor: course.instructor
      ? {
          documentId: course.instructor.documentId,
          username: course.instructor.username ?? "Instructor",
        }
      : null,
    lessons: (course.lessons ?? [])
      .map((lesson) => ({
        documentId: lesson.documentId,
        title: lesson.title,
        position: lesson.position,
      }))
      .sort((a, b) => a.position - b.position),
  };
}

const courseFields = [
  "title",
  "slug",
  "description",
  "thumbnailUrl",
  "publishedAt",
] satisfies Modules.Documents.Params.Fields.ArrayNotation<"api::course.course">;
const coursePopulate = {
  instructor: { fields: ["documentId", "username"] },
  lessons: {
    fields: ["documentId", "title", "position"],
    sort: ["position:asc"],
  },
} satisfies Modules.Documents.Params.Populate.ObjectNotation<"api::course.course">;

export default factories.createCoreService(
  "api::course.course",
  ({ strapi }) => {
    async function findManagedOne(documentId: string) {
      const [course, published] = await Promise.all([
        strapi.documents("api::course.course").findOne({
          documentId,
          status: "draft",
          fields: courseFields,
          populate: coursePopulate,
        }),
        strapi.documents("api::course.course").findOne({
          documentId,
          status: "published",
          fields: ["publishedAt", "updatedAt"],
        }),
      ]);

      return course
        ? courseDto({
            ...(course as unknown as CourseDocument),
            publishedAt: publicationDateFor(
              published as PublicationDocument | null,
            ),
          })
        : null;
    }

    async function resolveInstructor(
      user: ApplicationUser,
      instructorDocumentId?: string,
    ) {
      if (getRoleType(user) === APP_ROLES.INSTRUCTOR) {
        if (instructorDocumentId && instructorDocumentId !== user.documentId) {
          throw new ValidationError(
            "Instructors cannot assign a course to another user.",
          );
        }
        if (!user.documentId) {
          throw new ValidationError("The instructor account is invalid.");
        }
        return user.documentId;
      }
      if (!instructorDocumentId) return undefined;

      const instructor = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { documentId: instructorDocumentId },
          populate: { role: true },
        });
      if (!instructor || instructor.role?.type !== APP_ROLES.INSTRUCTOR) {
        throw new ValidationError(
          "The selected user must have the Instructor role.",
        );
      }
      return instructorDocumentId;
    }

    return {
      async findPublished() {
        const courses = await strapi.documents("api::course.course").findMany({
          status: "published",
          fields: courseFields,
          populate: coursePopulate,
          sort: ["createdAt:desc"],
        });

        return (courses as unknown as CourseDocument[]).map(courseDto);
      },

      async findPublishedOne(documentId: string) {
        const course = await strapi.documents("api::course.course").findOne({
          documentId,
          status: "published",
          fields: courseFields,
          populate: coursePopulate,
        });

        return course ? courseDto(course as unknown as CourseDocument) : null;
      },

      async findManaged(user: ApplicationUser) {
        const isInstructor = getRoleType(user) === APP_ROLES.INSTRUCTOR;
        const courses = await strapi.documents("api::course.course").findMany({
          status: "draft",
          filters: isInstructor ? { instructor: { id: user.id } } : undefined,
          fields: courseFields,
          populate: coursePopulate,
          sort: ["updatedAt:desc"],
        });
        const publishedCourses = await strapi
          .documents("api::course.course")
          .findMany({
            status: "published",
            fields: ["publishedAt", "updatedAt"],
          });
        const publicationById = new Map(
          (publishedCourses as PublicationDocument[]).map((course) => [
            course.documentId,
            publicationDateFor(course),
          ]),
        );
        return (courses as unknown as CourseDocument[]).map((course) =>
          courseDto({
            ...course,
            publishedAt: publicationById.get(course.documentId) ?? null,
          }),
        );
      },

      async findManagedOne(documentId: string) {
        return findManagedOne(documentId);
      },

      async createManaged(user: ApplicationUser, input: CourseCreateInput) {
        const { publish, instructorDocumentId, ...fields } = input;
        const instructor = await resolveInstructor(user, instructorDocumentId);
        const course = await strapi.documents("api::course.course").create({
          data: {
            ...fields,
            slug: slugify(fields.title),
            ...(instructor ? { instructor } : {}),
          } as never,
        });

        if (publish) {
          await strapi.documents("api::course.course").publish({
            documentId: course.documentId,
          });
        }

        return findManagedOne(course.documentId);
      },

      async updateManaged(
        documentId: string,
        input: CourseUpdateInput,
        user: ApplicationUser,
      ) {
        const { publish, instructorDocumentId, ...fields } = input;
        const instructor = instructorDocumentId
          ? await resolveInstructor(user, instructorDocumentId)
          : undefined;

        await strapi.documents("api::course.course").update({
          documentId,
          data: {
            ...fields,
            ...(instructor ? { instructor } : {}),
          } as never,
        });

        if (publish === true) {
          await strapi.documents("api::course.course").publish({ documentId });
        } else if (publish === false) {
          await strapi
            .documents("api::course.course")
            .unpublish({ documentId });
        }

        return findManagedOne(documentId);
      },

      async deleteManaged(documentId: string) {
        await strapi.db.transaction(async () => {
          const quizzes = await strapi.db.query("api::quiz.quiz").findMany({
            where: { course: { documentId } },
            select: ["id"],
          });
          const quizIds = quizzes.map(({ id }) => id);
          if (quizIds.length > 0) {
            await strapi.db.query("api::quiz-attempt.quiz-attempt").deleteMany({
              where: { quiz: { id: { $in: quizIds } } },
            });
            await strapi.db.query("api::quiz.quiz").deleteMany({
              where: { id: { $in: quizIds } },
            });
          }

          const lessons = await strapi.db.query("api::lesson.lesson").findMany({
            where: { course: { documentId } },
            select: ["id"],
          });
          const lessonIds = lessons.map(({ id }) => id);
          if (lessonIds.length > 0) {
            await strapi.db
              .query("api::lesson-progress.lesson-progress")
              .deleteMany({
                where: { lesson: { id: { $in: lessonIds } } },
              });
            await strapi.db.query("api::lesson.lesson").deleteMany({
              where: { id: { $in: lessonIds } },
            });
          }

          await strapi.db.query("api::enrollment.enrollment").deleteMany({
            where: { course: { documentId } },
          });
          await strapi.documents("api::course.course").delete({ documentId });
        });
        return { documentId };
      },
    };
  },
);
