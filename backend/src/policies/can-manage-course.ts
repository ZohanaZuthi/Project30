import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

import { canManageCourse, type ApplicationUser } from '../utils/authorization';

export default async (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
) => {
  const documentId = policyContext.params.courseDocumentId ?? policyContext.params.documentId;
  if (typeof documentId !== 'string') return false;

  const course = await strapi.db.query('api::course.course').findOne({
    where: { documentId },
    populate: { instructor: true },
  });

  if (!course) return false;

  policyContext.state.managedCourse = course;
  return canManageCourse(
    policyContext.state.user as ApplicationUser | undefined,
    course.instructor
  );
};

