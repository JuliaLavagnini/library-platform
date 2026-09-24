import type { RequestHandler } from 'express';
import {
  createBookSchema,
  listBooksQuerySchema,
  updateBookSchema,
} from '../schemas/book.schemas.ts';
import * as bookService from '../services/book.service.ts';

type IdParams = { id: string };

// Each handler parses its input with a Zod schema. Invalid input throws a ZodError,
// which the error handler turns into a 400 response.

export const listBooks: RequestHandler = async (req, res) => {
  const { search, available } = listBooksQuerySchema.parse(req.query);
  res.json(await bookService.listBooks({ search, availableOnly: available }));
};

export const getBook: RequestHandler<IdParams> = async (req, res) => {
  res.json(await bookService.getBook(req.params.id));
};

export const createBook: RequestHandler = async (req, res) => {
  const input = createBookSchema.parse(req.body);
  const book = await bookService.createBook(input);
  res.status(201).location(`${req.baseUrl}/${book.id}`).json(book);
};

export const updateBook: RequestHandler<IdParams> = async (req, res) => {
  const input = updateBookSchema.parse(req.body);
  res.json(await bookService.updateBook(req.params.id, input));
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
