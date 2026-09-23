import { isValidObjectId } from 'mongoose';
import { BookModel } from '../models/book.model.ts';
import { ConflictError, NotFoundError } from '../errors/http-errors.ts';

export interface CreateBookInput {
  isbn: string;
  title: string;
  author: string;
  genre?: string;
  totalCopies: number;
}

export type UpdateBookInput = Partial<CreateBookInput>;

export interface ListBooksFilter {
  search?: string;
  availableOnly?: boolean;
}

// User input goes into a regular expression, so special characters must be escaped.
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listBooks({ search, availableOnly }: ListBooksFilter = {}) {
  const query: Record<string, unknown> = {};

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ title: pattern }, { author: pattern }];
  }
  if (availableOnly) {
    query.availableCopies = { $gt: 0 };
  }

  return BookModel.find(query).sort({ title: 1 });
}

export async function getBook(id: string) {
  const book = isValidObjectId(id) ? await BookModel.findById(id) : null;
  if (!book) {
    throw new NotFoundError(`Book ${id} not found`);
  }
  return book;
}

export async function createBook(input: CreateBookInput) {
  // A new book starts with every copy on the shelf.
  return BookModel.create({ ...input, availableCopies: input.totalCopies });
}

export async function updateBook(id: string, input: UpdateBookInput) {
  const book = await getBook(id);

  if (input.totalCopies !== undefined) {
    const onLoan = book.totalCopies - book.availableCopies;
    if (input.totalCopies < onLoan) {
      throw new ConflictError(
        `Cannot set total copies to ${input.totalCopies}: ${onLoan} copies are currently on loan`,
      );
    }
    // Copies on loan stay on loan; the rest are on the shelf.
    book.availableCopies = input.totalCopies - onLoan;
    book.totalCopies = input.totalCopies;
  }
  if (input.isbn !== undefined) book.isbn = input.isbn;
  if (input.title !== undefined) book.title = input.title;
  if (input.author !== undefined) book.author = input.author;
  if (input.genre !== undefined) book.genre = input.genre;

  return book.save();
}

export async function deleteBook(id: string) {
  const book = await getBook(id);
  if (book.availableCopies < book.totalCopies) {
    throw new ConflictError(`Cannot delete book ${id}: copies are currently on loan`);
  }
  await book.deleteOne();
}
