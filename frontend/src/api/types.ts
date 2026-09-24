import type { components as BookComponents } from './generated/books.ts';
import type { components as UserComponents } from './generated/users.ts';

// Short names for the API's data shapes, all generated from the OpenAPI documents.

export type Book = BookComponents['schemas']['Book'];
export type CreateBook = BookComponents['schemas']['CreateBook'];

export type User = UserComponents['schemas']['User'];
export type Loan = UserComponents['schemas']['Loan'];
export type AuthResult = UserComponents['schemas']['AuthResult'];
export type Role = User['role'];
