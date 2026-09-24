import { Router } from 'express';
import * as loanController from '../controllers/loan.controller.ts';
import * as userController from '../controllers/user.controller.ts';

export const userRouter = Router();

userRouter.get('/', userController.listUsers);
userRouter.post('/', userController.createUser);
userRouter.get('/:id', userController.getUser);
userRouter.patch('/:id', userController.updateUser);
userRouter.delete('/:id', userController.deleteUser);

// A member's loans.
userRouter.get('/:id/loans', loanController.listUserLoans);
userRouter.post('/:id/loans', loanController.borrowBook);
userRouter.post('/:id/loans/:loanId/return', loanController.returnLoan);
