import { Router } from 'express';
import * as bookController from '../controllers/book.controller.ts';
import type { Auth } from '../middlewares/auth.ts';

export function createBookRouter({ authenticate, requireRole }: Auth) {
  const router = Router();

  // Anyone can browse the catalogue.
  router.get('/', bookController.listBooks);
  router.get('/:id', bookController.getBook);

  // Only librarians manage the catalogue.
  const librarian = [authenticate, requireRole('librarian')];
  router.post('/', librarian, bookController.createBook);
  router.patch('/:id', librarian, bookController.updateBook);
  router.delete('/:id', librarian, bookController.deleteBook);

  // Taking and returning copies happens only as part of a loan, so only user-service
  // may call these. A member calling them directly could change copy counts
  // without a loan being recorded.
  // Actions, not updates: POST because each call changes state (not idempotent).
  const service = [authenticate, requireRole('service')];
  router.post('/:id/borrow', service, bookController.borrowCopy);
  router.post('/:id/return', service, bookController.returnCopy);

  return router;
}
