import { z } from 'zod';

// Accepts ISBN-10 or ISBN-13, with or without hyphens/spaces, and stores digits only
// so "978-0-13-595705-9" and "9780135957059" are treated as the same book.
const isbnSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[-\s]/g, '').toUpperCase())
  .refine((value) => /^\d{9}[\dX]$/.test(value) || /^\d{13}$/.test(value), {
    message: 'ISBN must have 10 or 13 digits (ISBN-10 may end in X)',
  });

export const createBookSchema = z.strictObject({
  isbn: isbnSchema,
  title: z.string().trim().min(1, 'Title is required').max(300),
  author: z.string().trim().min(1, 'Author is required').max(200),
  genre: z.string().trim().min(1).max(100).optional(),
  totalCopies: z.number().int().min(1, 'Total copies must be at least 1').max(10_000),
});

export const updateBookSchema = createBookSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listBooksQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  available: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
