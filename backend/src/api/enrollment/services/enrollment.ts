import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import type { ApplicationUser } from '../../../utils/authorization';
import { calculateProgress } from '../../../utils/progress';
import { enrollmentKey } from '../../../utils/unique-key';

const { NotFoundError } = errors;

type EnrollmentDocument = {
  documentId: string;
  enrolledAt: string;
  course?: { documentId: string } | null;
};

type CourseDocument = {
  documentId: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  instructor?: { username?: string } | null;
  lessons?: Array<{ documentId: string; title: string; position: number }>;
};

function courseDto(course: CourseDocument) {
  return {
    documentId: course.documentId,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl ?? null,
    instructor: course.instructor
      ? { username: course.instructor.username ?? 'Instructor' }
      : null,
    lessons: (course.lessons ?? [])
      .map(({ documentId, title, position }) => ({ documentId, title, position }))
      .sort((a, b) => a.position - b.position),
  };
}

async function findPublishedCourse(strapi: Core.Strapi, documentId: string) {
  return (await strapi.documents('api::course.course').findOne({
    documentId,
    status: 'published',
    fields: ['title', 'slug', 'description', 'thumbnailUrl'],
    populate: {
      instructor: { fields: ['username'] },
      lessons: { fields: ['documentId', 'title', 'position'], sort: ['position:asc'] },
    },
  })) as CourseDocument | null;
}

export default factories.createCoreService(
  'api::enrollment.enrollment',
  ({ strapi }) => {
    async function progressForCourse(studentId: number, courseDocumentId: string) {
      const lessons = (await strapi.db.query('api::lesson.lesson').findMany({
        where: { course: { documentId: courseDocumentId } },
        select: ['documentId'],
      })) as Array<{ documentId: string }>;
      const lessonIds = lessons.map(({ documentId }) => documentId);
      if (lessonIds.length === 0) return calculateProgress(0, 0);

      const completed = await strapi.documents('api::lesson-progress.lesson-progress').count({
        filters: {
          student: { id: studentId },
          lesson: { documentId: { $in: lessonIds } },
        },
      });

      return calculateProgress(lessonIds.length, completed);
    }

    return {
    async enroll(user: ApplicationUser, courseDocumentId: string) {
      const course = await findPublishedCourse(strapi, courseDocumentId);
      if (!course) throw new NotFoundError('Published course not found.');

      const key = enrollmentKey(user.id, courseDocumentId);
      const existing = (await strapi.documents('api::enrollment.enrollment').findFirst({
        filters: { uniqueKey: key },
        fields: ['enrolledAt'],
      })) as unknown as EnrollmentDocument | null;

      if (existing) {
        return {
          documentId: existing.documentId,
          enrolledAt: existing.enrolledAt,
          course: courseDto(course),
          alreadyEnrolled: true,
        };
      }

      let enrollment: EnrollmentDocument;
      try {
        enrollment = (await strapi.documents('api::enrollment.enrollment').create({
          data: {
            student: user.documentId,
            course: courseDocumentId,
            enrolledAt: new Date().toISOString(),
            uniqueKey: key,
          } as never,
        })) as unknown as EnrollmentDocument;
      } catch (error) {
        const concurrent = (await strapi
          .documents('api::enrollment.enrollment')
          .findFirst({ filters: { uniqueKey: key }, fields: ['enrolledAt'] })) as unknown as EnrollmentDocument | null;
        if (!concurrent) throw error;
        return {
          documentId: concurrent.documentId,
          enrolledAt: concurrent.enrolledAt,
          course: courseDto(course),
          alreadyEnrolled: true,
        };
      }

      return {
        documentId: enrollment.documentId,
        enrolledAt: enrollment.enrolledAt,
        course: courseDto(course),
        alreadyEnrolled: false,
      };
    },

    async findMine(user: ApplicationUser) {
      const enrollments = (await strapi.documents('api::enrollment.enrollment').findMany({
        filters: { student: { id: user.id } },
        fields: ['enrolledAt'],
        populate: { course: { fields: ['documentId'] } },
        sort: ['enrolledAt:desc'],
      })) as unknown as EnrollmentDocument[];

      const results = await Promise.all(
        enrollments.map(async (enrollment) => {
          if (!enrollment.course) return null;
          const course = await findPublishedCourse(strapi, enrollment.course.documentId);
          if (!course) return null;
          const progress = await progressForCourse(user.id, course.documentId);

          return {
            enrollmentDocumentId: enrollment.documentId,
            enrolledAt: enrollment.enrolledAt,
            course: courseDto(course),
            progress,
          };
        })
      );

      return results.filter(Boolean);
    },

    async findMineOne(user: ApplicationUser, courseDocumentId: string) {
      const course = await findPublishedCourse(strapi, courseDocumentId);
      if (!course) throw new NotFoundError('Published course not found.');

      return {
        course: courseDto(course),
        progress: await progressForCourse(user.id, courseDocumentId),
      };
    },

    async progressForCourse(studentId: number, courseDocumentId: string) {
      return progressForCourse(studentId, courseDocumentId);
    },

    async isEnrolled(studentId: number, courseDocumentId: string) {
      const count = await strapi.documents('api::enrollment.enrollment').count({
        filters: {
          student: { id: studentId },
          course: { documentId: courseDocumentId },
        },
      });
      return count > 0;
    },
    };
  }
);
