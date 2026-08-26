import { randomUUID } from 'node:crypto';

import { factories } from '@strapi/strapi';

import {
  APP_ROLES,
  getRoleType,
  type ApplicationUser,
} from '../../../utils/authorization';
import type {
  courseCreateSchema,
  courseUpdateSchema,
} from '../../../utils/validation';
import type { z } from 'zod';

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

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);

  return `${base || 'course'}-${randomUUID().slice(0, 8)}`;
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
          username: course.instructor.username ?? 'Instructor',
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

const courseFields = ['title', 'slug', 'description', 'thumbnailUrl', 'publishedAt'];
const coursePopulate = {
  instructor: { fields: ['documentId', 'username'] },
  lessons: { fields: ['documentId', 'title', 'position'], sort: ['position:asc'] },
};

export default factories.createCoreService('api::course.course', ({ strapi }) => ({
  async findPublished() {
    const courses = await strapi.documents('api::course.course').findMany({
      status: 'published',
      fields: courseFields,
      populate: coursePopulate,
      sort: ['createdAt:desc'],
    });

    return (courses as unknown as CourseDocument[]).map(courseDto);
  },

  async findPublishedOne(documentId: string) {
    const course = await strapi.documents('api::course.course').findOne({
      documentId,
      status: 'published',
      fields: courseFields,
      populate: coursePopulate,
    });

    return course ? courseDto(course as unknown as CourseDocument) : null;
  },

  async findManaged(user: ApplicationUser) {
    const isInstructor = getRoleType(user) === APP_ROLES.INSTRUCTOR;
    const courses = await strapi.documents('api::course.course').findMany({
      status: 'draft',
      filters: isInstructor ? { instructor: { id: user.id } } : undefined,
      fields: courseFields,
      populate: coursePopulate,
      sort: ['updatedAt:desc'],
    });

    return (courses as unknown as CourseDocument[]).map(courseDto);
  },

  async findManagedOne(documentId: string) {
    const course = await strapi.documents('api::course.course').findOne({
      documentId,
      status: 'draft',
      fields: courseFields,
      populate: coursePopulate,
    });

    return course ? courseDto(course as unknown as CourseDocument) : null;
  },

  async createManaged(user: ApplicationUser, input: CourseCreateInput) {
    const { publish, ...fields } = input;
    const relation =
      getRoleType(user) === APP_ROLES.INSTRUCTOR && user.documentId
        ? { instructor: user.documentId }
        : {};
    const course = await strapi.documents('api::course.course').create({
      status: publish ? 'published' : undefined,
      data: {
        ...fields,
        slug: slugify(fields.title),
        ...relation,
      } as never,
    });

    return this.findManagedOne(course.documentId);
  },

  async updateManaged(documentId: string, input: CourseUpdateInput) {
    const { publish, ...fields } = input;

    await strapi.documents('api::course.course').update({
      documentId,
      status: publish ? 'published' : undefined,
      data: fields as never,
    });

    if (publish === false) {
      await strapi.documents('api::course.course').unpublish({ documentId });
    }

    return this.findManagedOne(documentId);
  },

  async deleteManaged(documentId: string) {
    await strapi.documents('api::course.course').delete({ documentId });
    return { documentId };
  },
}));
