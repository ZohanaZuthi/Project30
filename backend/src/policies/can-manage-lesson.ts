import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

import { canManageCourse, type ApplicationUser } from '../utils/authorization';

export default async (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
) => {
  const documentId = policyContext.params.lessonDocumentId ?? policyContext.params.documentId;
  if (typeof documentId !== 'string') return false;

  const lesson = await strapi.db.query('api::lesson.lesson').findOne({
    where: { documentId },
    populate: { course: { populate: { instructor: true } } },
  });

  if (!lesson?.course) return false;

  policyContext.state.managedLesson = lesson;
  return canManageCourse(
    policyContext.state.user as ApplicationUser | undefined,
    lesson.course.instructor
  );
};

