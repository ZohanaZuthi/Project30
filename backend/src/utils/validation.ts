import { errors } from '@strapi/utils';
import { z } from 'zod';

const { ValidationError } = errors;

const optionalUrl = z
  .union([z.url('Enter a valid URL.'), z.literal('')])
  .optional()
  .transform((value) => value || undefined);

const publishField = z.boolean().optional().default(false);

export const courseCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(1).max(10_000),
    thumbnailUrl: optionalUrl,
    instructorDocumentId: z.string().trim().min(1).optional(),
    publish: publishField,
  })
  .strict();

export const courseUpdateSchema = courseCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

const lessonFields = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().max(50_000).optional(),
  videoUrl: optionalUrl,
  position: z.coerce.number().int().min(1).max(10_000),
});

export const lessonCreateSchema = lessonFields
  .strict()
  .refine(
    (value) => Boolean(value.content || value.videoUrl),
    'A lesson needs text content, a video URL, or both.'
  );

export const lessonUpdateSchema = lessonFields
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.')
  .refine(
    (value) =>
      !("content" in value && "videoUrl" in value) ||
      Boolean(value.content || value.videoUrl),
    'A lesson needs text content, a video URL, or both.'
  );

export const quizQuestionSchema = z
  .object({
    prompt: z.string().trim().min(3).max(2_000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
    correctOption: z.number().int().min(0),
  })
  .strict()
  .refine(
    (question) => question.correctOption < question.options.length,
    'The correct option must point to an existing option.'
  );

const quizFields = z.object({
  title: z.string().trim().min(2).max(180),
  position: z.coerce.number().int().min(1).max(10_000),
  questions: z.array(quizQuestionSchema).min(1).max(100),
});

export const quizCreateSchema = quizFields.strict();
export const quizUpdateSchema = quizFields
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const quizSubmissionSchema = z
  .object({
    answers: z.array(z.number().int().min(0)).min(1).max(100),
  })
  .strict();

const blogFields = z.object({
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(1).max(100_000),
  coverImageUrl: optionalUrl,
  publish: publishField,
});

export const blogCreateSchema = blogFields.strict();
export const blogUpdateSchema = blogFields
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const roleUpdateSchema = z
  .object({
    role: z.enum(['admin', 'content_manager', 'instructor', 'student']).nullable(),
  })
  .strict();

export const userStatusSchema = z
  .object({ blocked: z.boolean() })
  .strict();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(' ');
    throw new ValidationError(message);
  }

  return result.data;
}
