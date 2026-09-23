import { Router } from 'express';
import * as bookController from '../controllers/book.controller.ts';

export const bookRouter = Router();

bookRouter.get('/', bookController.listBooks);
bookRouter.post('/', bookController.createBook);
bookRouter.get('/:id', bookController.getBook);
bookRouter.patch('/:id', bookController.updateBook);
bookRouter.delete('/:id', bookController.deleteBook);

// Actions, not updates: POST because each call changes state (not idempotent).
bookRouter.post('/:id/borrow', bookController.borrowCopy);
bookRouter.post('/:id/return', bookController.returnCopy);
