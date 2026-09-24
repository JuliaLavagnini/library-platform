import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { LoanModel } from '../../src/models/loan.model.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

function buildLoan(overrides: { status?: 'active' | 'returned'; dueAt: Date }) {
  return new LoanModel({
    userId: new Types.ObjectId(),
    bookId: new Types.ObjectId().toString(),
    bookTitle: 'Clean Code',
    ...overrides,
  });
}

describe('LoanModel overdue flag', () => {
  it('is false for an active loan that is not yet due', () => {
    const loan = buildLoan({ dueAt: new Date(Date.now() + DAY_MS) });
    expect(loan.toJSON()).toMatchObject({ overdue: false });
  });

  it('is true for an active loan past its due date', () => {
    const loan = buildLoan({ dueAt: new Date(Date.now() - DAY_MS) });
    expect(loan.toJSON()).toMatchObject({ overdue: true });
  });

  it('is false for a returned loan, even if it was returned late', () => {
    const loan = buildLoan({ status: 'returned', dueAt: new Date(Date.now() - DAY_MS) });
    expect(loan.toJSON()).toMatchObject({ overdue: false });
  });

  it('starts as active with no return date', () => {
    const loan = buildLoan({ dueAt: new Date(Date.now() + DAY_MS) });
    expect(loan.status).toBe('active');
    expect(loan.returnedAt).toBeNull();
  });
});
