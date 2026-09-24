import { describe, expect, it } from 'vitest';
import { borrowBookSchema, listLoansQuerySchema } from '../../src/schemas/loan.schemas.ts';

describe('borrowBookSchema', () => {
  it('accepts a MongoDB ObjectId', () => {
    const bookId = '6ab476e7fd279464c59b87b6';
    expect(borrowBookSchema.parse({ bookId })).toEqual({ bookId });
  });

  // bookId is placed in the URL of a request to book-service, so anything
  // other than an id (like a path) must never get through.
  it.each(['../../admin', 'abc', '6ab476e7fd279464c59b87b6/return', ''])(
    'rejects the bookId "%s"',
    (bookId) => {
      expect(borrowBookSchema.safeParse({ bookId }).success).toBe(false);
    },
  );

  it('rejects extra fields such as a client-supplied title', () => {
    const result = borrowBookSchema.safeParse({
      bookId: '6ab476e7fd279464c59b87b6',
      bookTitle: 'Fake title',
    });
    expect(result.success).toBe(false);
  });
});

describe('listLoansQuerySchema', () => {
  it.each(['active', 'returned', 'overdue'] as const)('accepts status=%s', (status) => {
    expect(listLoansQuerySchema.parse({ status }).status).toBe(status);
  });

  it('rejects an unknown status', () => {
    expect(listLoansQuerySchema.safeParse({ status: 'lost' }).success).toBe(false);
  });
});
