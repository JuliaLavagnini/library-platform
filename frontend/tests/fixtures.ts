import type { Book, Loan, User } from '../src/api/types.ts';

// Sample data shaped exactly like the API's responses (the types come from the OpenAPI
// documents, so these fixtures stop compiling if the API changes).

const timestamps = { createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z' };

export const books: Book[] = [
  {
    id: 'book-1',
    isbn: '9780135957059',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas, Andrew Hunt',
    genre: 'Software',
    totalCopies: 3,
    availableCopies: 2,
    ...timestamps,
  },
  {
    id: 'book-2',
    isbn: '9780134757599',
    title: 'Refactoring',
    author: 'Martin Fowler',
    genre: 'Software',
    totalCopies: 1,
    availableCopies: 0,
    ...timestamps,
  },
];

export const member: User = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  membershipId: 'MBR-1A2B3C4D',
  role: 'member',
  ...timestamps,
};

export const librarian: User = {
  id: 'user-2',
  name: 'Grace Hopper',
  email: 'grace@library.test',
  membershipId: 'MBR-5E6F7A8B',
  role: 'librarian',
  ...timestamps,
};

export function loanOf(book: Book, overrides: Partial<Loan> = {}): Loan {
  return {
    id: `loan-${book.id}`,
    userId: member.id,
    bookId: book.id,
    bookTitle: book.title,
    status: 'active',
    overdue: false,
    borrowedAt: '2026-09-20T10:00:00.000Z',
    dueAt: '2026-10-04T10:00:00.000Z',
    returnedAt: null,
    ...timestamps,
    ...overrides,
  };
}
