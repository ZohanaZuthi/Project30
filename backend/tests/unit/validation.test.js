require('ts-node/register/transpile-only');

const {
  blogCreateSchema,
  courseCreateSchema,
  lessonCreateSchema,
  quizCreateSchema,
  quizSubmissionSchema,
  roleUpdateSchema,
} = require('../../src/utils/validation');

describe('API input validation', () => {
  test('rejects client-selected signup concerns from course input', () => {
    expect(courseCreateSchema.safeParse({
      title: 'Secure APIs',
      description: 'Course',
      role: 'admin',
    }).success).toBe(false);
  });

  test('requires lesson text or a video URL', () => {
    expect(lessonCreateSchema.safeParse({ title: 'Intro', position: 1 }).success).toBe(false);
  });

  test('requires a quiz correct option to exist', () => {
    expect(quizCreateSchema.safeParse({
      title: 'Quiz',
      questions: [{ prompt: 'Choose one', options: ['A', 'B'], correctOption: 2 }],
    }).success).toBe(false);
  });

  test('a quiz submission accepts answers only', () => {
    expect(quizSubmissionSchema.safeParse({ answers: [0], score: 100 }).success).toBe(false);
  });

  test('validates blog and admin role payloads', () => {
    expect(blogCreateSchema.safeParse({ title: 'Post', body: 'Body' }).success).toBe(true);
    expect(roleUpdateSchema.safeParse({ role: 'super_admin' }).success).toBe(false);
  });
});
