import type { Context } from 'koa';

import { getAuthenticatedUser } from '../../../utils/authorization';
import {
  parseBody,
  quizCreateSchema,
  quizSubmissionSchema,
  quizUpdateSchema,
} from '../../../utils/validation';

type QuizService = {
  findForCourse(courseDocumentId: string, includeAnswers: boolean): Promise<unknown>;
  findOneForCourse(courseDocumentId: string, quizDocumentId: string, includeAnswers: boolean): Promise<unknown>;
  createForCourse(courseDocumentId: string, input: unknown): Promise<unknown>;
  updateManaged(quizDocumentId: string, input: unknown): Promise<unknown>;
  deleteManaged(quizDocumentId: string): Promise<unknown>;
  submit(userId: number, courseDocumentId: string, quizDocumentId: string, answers: number[]): Promise<unknown>;
};

function service() {
  return strapi.service('api::quiz.quiz') as unknown as QuizService;
}

export default {
  async findForManagedCourse(ctx: Context) {
    ctx.body = { data: await service().findForCourse(ctx.params.courseDocumentId, true) };
  },

  async createForManagedCourse(ctx: Context) {
    const input = parseBody(quizCreateSchema, ctx.request.body);
    ctx.status = 201;
    ctx.body = { data: await service().createForCourse(ctx.params.courseDocumentId, input) };
  },

  async updateManaged(ctx: Context) {
    const input = parseBody(quizUpdateSchema, ctx.request.body);
    ctx.body = { data: await service().updateManaged(ctx.params.quizDocumentId, input) };
  },

  async deleteManaged(ctx: Context) {
    ctx.body = { data: await service().deleteManaged(ctx.params.quizDocumentId) };
  },

  async findForStudent(ctx: Context) {
    ctx.body = { data: await service().findForCourse(ctx.params.courseDocumentId, false) };
  },

  async findOneForStudent(ctx: Context) {
    ctx.body = {
      data: await service().findOneForCourse(
        ctx.params.courseDocumentId,
        ctx.params.quizDocumentId,
        false
      ),
    };
  },

  async submit(ctx: Context) {
    const user = getAuthenticatedUser(ctx);
    const { answers } = parseBody(quizSubmissionSchema, ctx.request.body);
    ctx.status = 201;
    ctx.body = {
      data: await service().submit(
        user.id,
        ctx.params.courseDocumentId,
        ctx.params.quizDocumentId,
        answers
      ),
    };
  },
};
