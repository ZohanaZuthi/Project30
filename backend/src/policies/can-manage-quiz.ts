import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

import { canManageCourse, type ApplicationUser } from '../utils/authorization';

export default async (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
) => {
  const documentId = policyContext.params.quizDocumentId;
  if (typeof documentId !== 'string') return false;

  const quiz = await strapi.db.query('api::quiz.quiz').findOne({
    where: { documentId },
    populate: { course: { populate: { instructor: true } } },
  });
  if (!quiz?.course) return false;

  policyContext.state.managedQuiz = quiz;
  return canManageCourse(
    policyContext.state.user as ApplicationUser | undefined,
    quiz.course.instructor
  );
};
