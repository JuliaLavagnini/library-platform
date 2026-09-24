import { z } from 'zod';

export const borrowBookSchema = z.strictObject({
  bookId: z.string().regex(/^[a-f\d]{24}$/i, 'bookId must be a valid book ID'),
});

export const listLoansQuerySchema = z.object({
  status: z.enum(['active', 'returned', 'overdue']).optional(),
});

export type LoanStatusFilter = z.infer<typeof listLoansQuerySchema>['status'];
