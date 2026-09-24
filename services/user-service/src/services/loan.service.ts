import { isValidObjectId } from 'mongoose';
import * as bookClient from '../clients/book.client.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import { ConflictError, NotFoundError } from '../errors/http-errors.ts';
import { LoanModel } from '../models/loan.model.ts';
import type { LoanStatusFilter } from '../schemas/loan.schemas.ts';
import { getUser } from './user.service.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ListLoansFilter {
  userId?: string;
  status?: LoanStatusFilter;
}

export async function listLoans({ userId, status }: ListLoansFilter = {}) {
  const query: Record<string, unknown> = {};

  if (userId) query.userId = userId;
  if (status === 'overdue') {
    query.status = 'active';
    query.dueAt = { $lt: new Date() };
  } else if (status) {
    query.status = status;
  }

  return LoanModel.find(query).sort({ borrowedAt: -1 });
}

export async function listUserLoans(userId: string, status?: LoanStatusFilter) {
  await getUser(userId); // 404 if the member does not exist.
  return listLoans({ userId, status });
}

// Borrowing touches two services: book-service takes a copy off the shelf, then this
// service records the loan. If recording fails, the copy is handed back (a compensating
// action) so the two services stay consistent.
export async function borrowBook(userId: string, bookId: string) {
  await getUser(userId);

  if (await LoanModel.exists({ userId, bookId, status: 'active' })) {
    throw new ConflictError('This member already has this book on loan');
  }

  const book = await bookClient.borrowBookCopy(bookId);

  try {
    const borrowedAt = new Date();
    return await LoanModel.create({
      userId,
      bookId,
      bookTitle: book.title,
      borrowedAt,
      dueAt: new Date(borrowedAt.getTime() + env.LOAN_PERIOD_DAYS * DAY_MS),
    });
  } catch (err) {
    await bookClient.returnBookCopy(bookId).catch((compensationErr: unknown) => {
      // Needs manual repair: book-service still counts this copy as on loan.
      logger.error({ err: compensationErr, bookId }, 'compensation failed: copy not returned');
    });
    throw err;
  }
}

// The loan is closed first (atomically, so it can't be returned twice), then the copy
// goes back on the shelf. If book-service fails, the loan is reopened so the member can retry.
export async function returnLoan(userId: string, loanId: string) {
  if (!isValidObjectId(loanId)) {
    throw new NotFoundError(`Loan ${loanId} not found`);
  }

  const loan = await LoanModel.findOneAndUpdate(
    { _id: loanId, userId, status: 'active' },
    { status: 'returned', returnedAt: new Date() },
    { returnDocument: 'after' },
  );

  if (!loan) {
    const exists = await LoanModel.exists({ _id: loanId, userId });
    if (!exists) throw new NotFoundError(`Loan ${loanId} not found`);
    throw new ConflictError(`Loan ${loanId} has already been returned`);
  }

  try {
    await bookClient.returnBookCopy(loan.bookId);
  } catch (err) {
    await LoanModel.updateOne({ _id: loan._id }, { status: 'active', returnedAt: null });
    throw err;
  }

  return loan;
}
