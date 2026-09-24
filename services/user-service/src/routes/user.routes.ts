import { Router } from 'express';
import * as loanController from '../controllers/loan.controller.ts';
import * as userController from '../controllers/user.controller.ts';
import { authenticate, requireRole, requireSelfOrLibrarian } from '../middlewares/auth.ts';

export const userRouter = Router();

// Every route here needs a valid token.
userRouter.use(authenticate);

// Managing the member list is for librarians.
userRouter.get('/', requireRole('librarian'), userController.listUsers);
userRouter.post('/', requireRole('librarian'), userController.createUser);
userRouter.delete('/:id', requireRole('librarian'), userController.deleteUser);

// A member can see and update their own profile; librarians can for anyone.
userRouter.get('/:id', requireSelfOrLibrarian, userController.getUser);
userRouter.patch('/:id', requireSelfOrLibrarian, userController.updateUser);

// A member's loans: members manage their own; librarians can act for anyone at the desk.
userRouter.get('/:id/loans', requireSelfOrLibrarian, loanController.listUserLoans);
userRouter.post('/:id/loans', requireSelfOrLibrarian, loanController.borrowBook);
userRouter.post('/:id/loans/:loanId/return', requireSelfOrLibrarian, loanController.returnLoan);
