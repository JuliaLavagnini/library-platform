import { z } from 'zod';

// These schemas validate requests and also generate the OpenAPI docs (see docs/openapi.ts),
// so the documentation can never drift from what the API actually accepts.

// Accepts ISBN-10 or ISBN-13, with or without hyphens/spaces, and stores digits only
// so "978-0-13-595705-9" and "9780135957059" are treated as the same book.
const isbnSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[-\s]/g, '').toUpperCase())
  .refine((value) => /^\d{9}[\dX]$/.test(value) || /^\d{13}$/.test(value), {
    message: 'ISBN must have 10 or 13 digits (ISBN-10 may end in X)',
  })
  .meta({
    description: 'ISBN-10 or ISBN-13. Hyphens and spaces are allowed and removed.',
    example: '978-0-13-595705-9',
  });

export const createBookSchema = z
  .strictObject({
    isbn: isbnSchema,
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(300)
      .meta({ example: 'The Pragmatic Programmer' }),
    author: z
      .string()
      .trim()
      .min(1, 'Author is required')
      .max(200)
      .meta({ example: 'David Thomas' }),
    genre: z.string().trim().min(1).max(100).optional().meta({ example: 'Software' }),
    totalCopies: z
      .number()
      .int()
      .min(1, 'Total copies must be at least 1')
      .max(10_000)
      .meta({ description: 'Copies the library owns. All start on the shelf.', example: 3 }),
  })
  .meta({ id: 'CreateBook' });

export const updateBookSchema = createBookSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Provide at least one field to update',
  })
  .meta({
    id: 'UpdateBook',
    description:
      'Send only the fields to change (at least one). Changing totalCopies keeps copies on loan unchanged.',
  });

export const listBooksQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .meta({ description: 'Matches title or author, ignoring case', example: 'pragmatic' }),
  available: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .meta({ description: 'Only books with at least one copy on the shelf' }),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
