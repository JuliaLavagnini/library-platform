import { z } from 'zod';

export const borrowBookSchema = z
  .strictObject({
    bookId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'bookId must be a valid book ID')
      .meta({ description: 'ID of a book in book-service', example: '6ab476e7fd279464c59b87b6' }),
  })
  .meta({
    id: 'BorrowBook',
    description: 'The book title is fetched from book-service, not sent by the client.',
  });

export const listLoansQuerySchema = z.object({
  status: z
    .enum(['active', 'returned', 'overdue'])
    .optional()
    .meta({ description: 'overdue = active loans past their due date' }),
});

export type LoanStatusFilter = z.infer<typeof listLoansQuerySchema>['status'];
