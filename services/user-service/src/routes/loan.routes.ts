import { Router } from 'express';
import * as loanController from '../controllers/loan.controller.ts';

// Library-wide view, e.g. GET /api/loans?status=overdue
export const loanRouter = Router();

loanRouter.get('/', loanController.listLoans);
