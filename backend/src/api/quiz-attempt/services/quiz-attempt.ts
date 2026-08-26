import { factories } from '@strapi/strapi';

type AttemptDocument = {
  documentId: string;
  answers: Array<number | null>;
  score: number;
  total: number;
  submittedAt: string;
  quiz?: {
    documentId: string;
    title: string;
    course?: { documentId: string; title: string } | null;
  } | null;
};

export default factories.createCoreService(
  'api::quiz-attempt.quiz-attempt',
  ({ strapi }) => ({
    async findMine(studentId: number) {
      const attempts = (await strapi
        .documents('api::quiz-attempt.quiz-attempt')
        .findMany({
          filters: { student: { id: studentId } },
          fields: ['answers', 'score', 'total', 'submittedAt'],
          populate: {
            quiz: {
              fields: ['documentId', 'title'],
              populate: { course: { fields: ['documentId', 'title'] } },
            },
          },
          sort: ['submittedAt:desc'],
        })) as unknown as AttemptDocument[];

      return attempts.map((attempt) => ({
        documentId: attempt.documentId,
        answers: attempt.answers,
        score: attempt.score,
        total: attempt.total,
        percentage:
          attempt.total === 0
            ? 0
            : Math.round((attempt.score / attempt.total) * 100),
        submittedAt: attempt.submittedAt,
        quiz: attempt.quiz
          ? {
              documentId: attempt.quiz.documentId,
              title: attempt.quiz.title,
              course: attempt.quiz.course ?? null,
            }
          : null,
      }));
    },
  })
);
