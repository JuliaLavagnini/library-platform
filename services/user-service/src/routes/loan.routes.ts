import { Router } from 'express';
import * as loanController from '../controllers/loan.controller.ts';
import { authenticate, requireRole } from '../middlewares/auth.ts';

// Library-wide view, e.g. GET /api/loans?status=overdue. Librarians only.
export const loanRouter = Router();

loanRouter.use(authenticate, requireRole('librarian'));

loanRouter.get('/', loanController.listLoans);
