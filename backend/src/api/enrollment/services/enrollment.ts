import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import type { ApplicationUser } from '../../../utils/authorization';
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
  quizzes?: Array<{ documentId: string; title: string; position: number }>;
};

type LessonProgressService = {
  forStudent(studentId: number, courseDocumentId: string): Promise<unknown>;
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
    quizzes: (course.quizzes ?? []).map(({ documentId, title, position }) => ({
      documentId,
      title,
      position,
    })).sort((a, b) => a.position - b.position),
  };
}

async function findPublishedCourse(strapi: Core.Strapi, documentId: string) {
  return (await strapi.documents('api::course.course').findOne({
    documentId,
    status: 'published',
    fields: ['title', 'slug', 'description', 'thumbnailUrl'],
    populate: {
      instructor: { fields: ['username'] },
      lessons: {
        fields: ['documentId', 'title', 'position'],
        sort: ['position:asc', 'createdAt:asc'],
      },
      quizzes: {
        fields: ['documentId', 'title', 'position'],
        sort: ['position:asc', 'createdAt:asc'],
      },
    },
  })) as CourseDocument | null;
}

export default factories.createCoreService(
  'api::enrollment.enrollment',
  ({ strapi }) => {
    async function progressForCourse(studentId: number, courseDocumentId: string) {
      const progress = strapi.service(
        'api::lesson-progress.lesson-progress'
      ) as unknown as LessonProgressService;
      return progress.forStudent(studentId, courseDocumentId);
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
      // Enrollment is not draft/published, while Course is. Query Engine keeps
      // the stored relation visible regardless of which Course version the
      // link table currently targets; we then reload the published document by
      // its stable documentId before returning anything to the Student.
      const enrollments = (await strapi.db
        .query('api::enrollment.enrollment')
        .findMany({
          where: { student: { id: user.id } },
          select: ['documentId', 'enrolledAt'],
          populate: { course: { select: ['documentId'] } },
          orderBy: { enrolledAt: 'desc' },
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
