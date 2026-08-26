import { errors } from '@strapi/utils';
import { z } from 'zod';

const { ValidationError } = errors;

const optionalUrl = z
  .union([z.url('Enter a valid URL.'), z.literal('')])
  .optional()
  .transform((value) => value || undefined);

export const courseCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(1).max(10_000),
    thumbnailUrl: optionalUrl,
    publish: z.boolean().optional().default(false),
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

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(' ');
    throw new ValidationError(message);
  }

  return result.data;
}
