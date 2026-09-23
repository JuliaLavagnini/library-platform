import type { RequestHandler } from 'express';
import * as bookService from '../services/book.service.ts';

type IdParams = { id: string };

export const listBooks: RequestHandler = async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const availableOnly = req.query.available === 'true';

  const books = await bookService.listBooks({
    ...(search !== undefined && { search }),
    availableOnly,
  });
  res.json(books);
};

export const getBook: RequestHandler<IdParams> = async (req, res) => {
  res.json(await bookService.getBook(req.params.id));
};

export const createBook: RequestHandler = async (req, res) => {
  // Only pick known fields so clients can't set availableCopies or _id directly.
  // Full request validation is added with Zod in a later step.
  const { isbn, title, author, genre, totalCopies } = req.body ?? {};
  const book = await bookService.createBook({ isbn, title, author, genre, totalCopies });
  res.status(201).location(`${req.baseUrl}/${book.id}`).json(book);
};

export const updateBook: RequestHandler<IdParams> = async (req, res) => {
  const { isbn, title, author, genre, totalCopies } = req.body ?? {};
  const book = await bookService.updateBook(req.params.id, {
    isbn,
    title,
    author,
    genre,
    totalCopies,
  });
  res.json(book);
};

export const borrowCopy: RequestHandler<IdParams> = async (req, res) => {
  res.json(await bookService.borrowCopy(req.params.id));
};

export const returnCopy: RequestHandler<IdParams> = async (req, res) => {
  res.json(await bookService.returnCopy(req.params.id));
};

export const deleteBook: RequestHandler<IdParams> = async (req, res) => {
  await bookService.deleteBook(req.params.id);
  res.status(204).end();
};
