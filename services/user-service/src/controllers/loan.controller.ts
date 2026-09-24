import type { RequestHandler } from 'express';
import { borrowBookSchema, listLoansQuerySchema } from '../schemas/loan.schemas.ts';
import * as loanService from '../services/loan.service.ts';

type UserParams = { id: string };
type LoanParams = { id: string; loanId: string };

export const listLoans: RequestHandler = async (req, res) => {
  const { status } = listLoansQuerySchema.parse(req.query);
  res.json(await loanService.listLoans({ status }));
};

export const listUserLoans: RequestHandler<UserParams> = async (req, res) => {
  const { status } = listLoansQuerySchema.parse(req.query);
  res.json(await loanService.listUserLoans(req.params.id, status));
};

export const borrowBook: RequestHandler<UserParams> = async (req, res) => {
  const { bookId } = borrowBookSchema.parse(req.body);
  const loan = await loanService.borrowBook(req.params.id, bookId);
  res.status(201).json(loan);
};

export const returnLoan: RequestHandler<LoanParams> = async (req, res) => {
  res.json(await loanService.returnLoan(req.params.id, req.params.loanId));
};
