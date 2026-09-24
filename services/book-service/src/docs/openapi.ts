import { z } from 'zod';
import { createDocument, type ZodOpenApiResponseObject } from 'zod-openapi';
import {
  createBookSchema,
  listBooksQuerySchema,
  updateBookSchema,
} from '../schemas/book.schemas.ts';

// Response shapes. Request shapes come straight from the validation schemas.

const objectId = z.string().meta({ example: '6ab476e7fd279464c59b87b6' });

const bookSchema = z
  .object({
    id: objectId,
    isbn: z.string().meta({ example: '9780135957059' }),
    title: z.string().meta({ example: 'The Pragmatic Programmer' }),
    author: z.string().meta({ example: 'David Thomas' }),
    genre: z.string().optional().meta({ example: 'Software' }),
    totalCopies: z.number().int().meta({ example: 3 }),
    availableCopies: z.number().int().meta({ description: 'Copies on the shelf', example: 2 }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Book' });

const errorSchema = z
  .object({
    error: z.object({
      message: z.string().meta({ example: 'Validation failed' }),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .meta({ example: [{ path: 'title', message: 'Title is required' }] }),
    }),
  })
  .meta({ id: 'Error' });

const idParams = z.object({ id: objectId.meta({ description: 'Book ID' }) });

function json(description: string, schema: z.ZodType): ZodOpenApiResponseObject {
  return { description, content: { 'application/json': { schema } } };
}

const errors = {
  badRequest: json('Invalid input', errorSchema),
  notFound: json('Book not found', errorSchema),
  conflict: (description: string) => json(description, errorSchema),
};

export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Book Service',
    version: '0.1.0',
    description: "Manages the library's book inventory and copy availability.",
  },
  tags: [{ name: 'Books' }, { name: 'Copies' }, { name: 'Health' }],
  paths: {
    '/api/books': {
      get: {
        tags: ['Books'],
        summary: 'List books',
        requestParams: { query: listBooksQuerySchema },
        responses: {
          '200': json('Books sorted by title', z.array(bookSchema)),
          '400': errors.badRequest,
        },
      },
      post: {
        tags: ['Books'],
        summary: 'Add a book',
        requestBody: { content: { 'application/json': { schema: createBookSchema } } },
        responses: {
          '201': json('The new book, with every copy available', bookSchema),
          '400': errors.badRequest,
          '409': errors.conflict('A book with this ISBN already exists'),
        },
      },
    },
    '/api/books/{id}': {
      get: {
        tags: ['Books'],
        summary: 'Get a book',
        requestParams: { path: idParams },
        responses: { '200': json('The book', bookSchema), '404': errors.notFound },
      },
      patch: {
        tags: ['Books'],
        summary: 'Update some fields of a book',
        requestParams: { path: idParams },
        requestBody: { content: { 'application/json': { schema: updateBookSchema } } },
        responses: {
          '200': json('The updated book', bookSchema),
          '400': errors.badRequest,
          '404': errors.notFound,
          '409': errors.conflict(
            'Duplicate ISBN, total copies below the number on loan, or the book was changed by another request',
          ),
        },
      },
      delete: {
        tags: ['Books'],
        summary: 'Delete a book',
        requestParams: { path: idParams },
        responses: {
          '204': { description: 'Deleted' },
          '404': errors.notFound,
          '409': errors.conflict('Copies are on loan'),
        },
      },
    },
    '/api/books/{id}/borrow': {
      post: {
        tags: ['Copies'],
        summary: 'Take one copy off the shelf',
        description:
          'Atomic: two requests can never take the same last copy. Normally called by user-service when a member borrows a book.',
        requestParams: { path: idParams },
        responses: {
          '200': json('The book with one fewer copy available', bookSchema),
          '404': errors.notFound,
          '409': errors.conflict('No copies are available'),
        },
      },
    },
    '/api/books/{id}/return': {
      post: {
        tags: ['Copies'],
        summary: 'Put one copy back on the shelf',
        requestParams: { path: idParams },
        responses: {
          '200': json('The book with one more copy available', bookSchema),
          '404': errors.notFound,
          '409': errors.conflict('Every copy is already on the shelf'),
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        responses: { '200': { description: 'The process is running' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        responses: {
          '200': { description: 'Ready: the database is reachable' },
          '503': { description: 'Not ready: the database is unreachable' },
        },
      },
    },
  },
});
