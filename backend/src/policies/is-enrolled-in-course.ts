import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

import { isStudent, type ApplicationUser } from '../utils/authorization';

export default async (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
) => {
  const user = policyContext.state.user as ApplicationUser | undefined;
  const courseDocumentId = policyContext.params.courseDocumentId;
  if (!isStudent(user) || !user || typeof courseDocumentId !== 'string') return false;

  const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
    where: {
      student: { id: user.id },
      course: { documentId: courseDocumentId },
    },
  });
  if (!enrollment) return false;

  const course = await strapi.documents('api::course.course').findOne({
    documentId: courseDocumentId,
    status: 'published',
    fields: ['documentId'],
  });
  if (!course) return false;

  policyContext.state.enrollment = enrollment;
  return true;
};
