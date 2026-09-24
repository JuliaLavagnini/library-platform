import { z } from 'zod';
import { createDocument, type ZodOpenApiResponseObject } from 'zod-openapi';
import { loginSchema, registerSchema } from '../schemas/auth.schemas.ts';
import { borrowBookSchema, listLoansQuerySchema } from '../schemas/loan.schemas.ts';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '../schemas/user.schemas.ts';

// Response shapes. Request shapes come straight from the validation schemas.

const objectId = z.string().meta({ example: '6ab476e7c288167098513c7b' });

const userSchema = z
  .object({
    id: objectId,
    name: z.string().meta({ example: 'Ada Lovelace' }),
    email: z.string().meta({ example: 'ada@example.com' }),
    membershipId: z.string().meta({ example: 'MBR-64760B5F' }),
    role: z.enum(['member', 'librarian']),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });

const loanSchema = z
  .object({
    id: objectId,
    userId: objectId,
    bookId: z.string().meta({ example: '6ab476e7fd279464c59b87b6' }),
    bookTitle: z.string().meta({
      description: 'Copied from book-service when the book was borrowed',
      example: 'The Pragmatic Programmer',
    }),
    status: z.enum(['active', 'returned']),
    overdue: z.boolean().meta({ description: 'Active and past its due date' }),
    borrowedAt: z.iso.datetime(),
    dueAt: z.iso.datetime(),
    returnedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Loan' });

const tokenFields = {
  accessToken: z.string().meta({ description: 'Send as "Authorization: Bearer <token>"' }),
  tokenType: z.literal('Bearer'),
  expiresIn: z
    .number()
    .int()
    .meta({ description: 'Seconds until the token expires', example: 900 }),
};

const authResultSchema = z.object({ user: userSchema, ...tokenFields }).meta({ id: 'AuthResult' });

const jwksSchema = z
  .object({ keys: z.array(z.record(z.string(), z.string())) })
  .meta({ id: 'JsonWebKeySet' });

const errorSchema = z
  .object({
    error: z.object({
      message: z.string().meta({ example: 'Validation failed' }),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .meta({ example: [{ path: 'email', message: 'Email must be a valid email address' }] }),
    }),
  })
  .meta({ id: 'Error' });

const userParams = z.object({ id: objectId.meta({ description: 'User ID' }) });
const loanParams = userParams.extend({ loanId: objectId.meta({ description: 'Loan ID' }) });

function json(description: string, schema: z.ZodType): ZodOpenApiResponseObject {
  return { description, content: { 'application/json': { schema } } };
}

const errors = {
  badRequest: json('Invalid input', errorSchema),
  notFound: (description: string) => json(description, errorSchema),
  conflict: (description: string) => json(description, errorSchema),
  unauthorized: json('Missing, invalid or expired token', errorSchema),
  forbidden: (description: string) => json(description, errorSchema),
  tooManyRequests: json('Too many attempts from this IP. Try again in a minute.', errorSchema),
  badGateway: json('book-service sent an unexpected response', errorSchema),
  unavailable: json('book-service could not be reached. Nothing was changed.', errorSchema),
};

// Access rules, shown on each protected operation.
const bearer = [{ bearerAuth: [] }];

const librarianOnly = {
  security: bearer,
  'x-access': 'Librarians only',
};

const selfOrLibrarian = {
  security: bearer,
  'x-access': 'The member themselves, or any librarian',
};

function authErrors(who: string) {
  return {
    '401': errors.unauthorized,
    '403': errors.forbidden(`Not allowed: ${who.toLowerCase()}`),
  };
}

export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'User Service',
    version: '0.1.0',
    description:
      'Manages library members and their loans. Borrowing and returning are coordinated with book-service.',
  },
  tags: [{ name: 'Auth' }, { name: 'Users' }, { name: 'Loans' }, { name: 'Health' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Sign up as a member',
        description: 'Creates a member account and logs it in.',
        requestBody: { content: { 'application/json': { schema: registerSchema } } },
        responses: {
          '201': json('The new member and an access token', authResultSchema),
          '400': errors.badRequest,
          '409': errors.conflict('An account with this email already exists'),
          '429': errors.tooManyRequests,
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: { content: { 'application/json': { schema: loginSchema } } },
        responses: {
          '200': json('The member and an access token', authResultSchema),
          '400': errors.badRequest,
          '401': json('Invalid email or password', errorSchema),
          '429': errors.tooManyRequests,
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the logged-in account',
        security: [{ bearerAuth: [] }],
        responses: { '200': json('The account', userSchema), '401': errors.unauthorized },
      },
    },
    '/.well-known/jwks.json': {
      get: {
        tags: ['Auth'],
        summary: 'Public keys for verifying tokens',
        description: 'Other services use these to check that a token was issued by user-service.',
        responses: { '200': json('JSON Web Key Set', jwksSchema) },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List members',
        ...librarianOnly,
        requestParams: { query: listUsersQuerySchema },
        responses: {
          ...authErrors(librarianOnly['x-access']),
          '200': json('Members sorted by name', z.array(userSchema)),
          '400': errors.badRequest,
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create an account (as a librarian)',
        ...librarianOnly,
        requestBody: { content: { 'application/json': { schema: createUserSchema } } },
        responses: {
          ...authErrors(librarianOnly['x-access']),
          '201': json('The new member, with a generated membership ID', userSchema),
          '400': errors.badRequest,
          '409': errors.conflict('A member with this email already exists'),
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a member',
        ...selfOrLibrarian,
        requestParams: { path: userParams },
        responses: {
          ...authErrors(selfOrLibrarian['x-access']),
          '200': json('The member', userSchema),
          '404': errors.notFound('Member not found'),
        },
      },
      patch: {
        tags: ['Users'],
        summary: "Update a member's name or email",
        ...selfOrLibrarian,
        requestParams: { path: userParams },
        requestBody: { content: { 'application/json': { schema: updateUserSchema } } },
        responses: {
          ...authErrors(selfOrLibrarian['x-access']),
          '200': json('The updated member', userSchema),
          '400': errors.badRequest,
          '404': errors.notFound('Member not found'),
          '409': errors.conflict('Another member has this email'),
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a member',
        ...librarianOnly,
        description: 'Loan history is kept. Members with books still on loan cannot be deleted.',
        requestParams: { path: userParams },
        responses: {
          ...authErrors(librarianOnly['x-access']),
          '204': { description: 'Deleted' },
          '404': errors.notFound('Member not found'),
          '409': errors.conflict('The member still has books on loan'),
        },
      },
    },
    '/api/users/{id}/loans': {
      get: {
        tags: ['Loans'],
        summary: "List a member's loans",
        ...selfOrLibrarian,
        requestParams: { path: userParams, query: listLoansQuerySchema },
        responses: {
          ...authErrors(selfOrLibrarian['x-access']),
          '200': json('Loans, most recent first', z.array(loanSchema)),
          '400': errors.badRequest,
          '404': errors.notFound('Member not found'),
        },
      },
      post: {
        tags: ['Loans'],
        summary: 'Borrow a book',
        ...selfOrLibrarian,
        description:
          'Takes a copy from book-service, then records the loan. If recording fails, the copy is handed back.',
        requestParams: { path: userParams },
        requestBody: { content: { 'application/json': { schema: borrowBookSchema } } },
        responses: {
          ...authErrors(selfOrLibrarian['x-access']),
          '201': json('The new loan', loanSchema),
          '400': errors.badRequest,
          '404': errors.notFound('Member or book not found'),
          '409': errors.conflict(
            'The member already has this book on loan, or no copies are available',
          ),
          '502': errors.badGateway,
          '503': errors.unavailable,
        },
      },
    },
    '/api/users/{id}/loans/{loanId}/return': {
      post: {
        tags: ['Loans'],
        summary: 'Return a loan',
        ...selfOrLibrarian,
        description:
          'Closes the loan, then puts the copy back in book-service. If that fails, the loan is reopened so it can be retried.',
        requestParams: { path: loanParams },
        responses: {
          ...authErrors(selfOrLibrarian['x-access']),
          '200': json('The returned loan', loanSchema),
          '404': errors.notFound('Loan not found for this member'),
          '409': errors.conflict('The loan has already been returned'),
          '502': errors.badGateway,
          '503': errors.unavailable,
        },
      },
    },
    '/api/loans': {
      get: {
        tags: ['Loans'],
        summary: 'List loans across all members',
        ...librarianOnly,
        description: 'Use ?status=overdue for the librarian view of late books.',
        requestParams: { query: listLoansQuerySchema },
        responses: {
          ...authErrors(librarianOnly['x-access']),
          '200': json('Loans, most recent first', z.array(loanSchema)),
          '400': errors.badRequest,
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
