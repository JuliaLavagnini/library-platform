import { Router } from 'express';
import * as bookController from '../controllers/book.controller.ts';

export const bookRouter = Router();

bookRouter.get('/', bookController.listBooks);
bookRouter.post('/', bookController.createBook);
bookRouter.get('/:id', bookController.getBook);
bookRouter.patch('/:id', bookController.updateBook);
bookRouter.delete('/:id', bookController.deleteBook);
