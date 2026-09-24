import { isValidObjectId } from 'mongoose';
import { BookModel } from '../models/book.model.ts';
import { ConflictError, NotFoundError } from '../errors/http-errors.ts';
import type { CreateBookInput, UpdateBookInput } from '../schemas/book.schemas.ts';

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

// Borrow and return use a single atomic update: the availability check and the change
// happen together in MongoDB, so two concurrent requests can never take the same last copy.
// Bumping __v makes any stale read-then-save (e.g. updateBook) fail instead of
// overwriting the new count.
export async function borrowCopy(id: string) {
  if (!isValidObjectId(id)) {
    throw new NotFoundError(`Book ${id} not found`);
  }

  const book = await BookModel.findOneAndUpdate(
    { _id: id, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1, __v: 1 } },
    { returnDocument: 'after' },
  );
  if (book) return book;

  await getBook(id); // Throws 404 if the book does not exist.
  throw new ConflictError(`No copies of book ${id} are available`);
}

export async function returnCopy(id: string) {
  if (!isValidObjectId(id)) {
    throw new NotFoundError(`Book ${id} not found`);
  }

  const book = await BookModel.findOneAndUpdate(
    { _id: id, $expr: { $lt: ['$availableCopies', '$totalCopies'] } },
    { $inc: { availableCopies: 1, __v: 1 } },
    { returnDocument: 'after' },
  );
  if (book) return book;

  await getBook(id);
  throw new ConflictError(`All copies of book ${id} are already on the shelf`);
}

export async function deleteBook(id: string) {
  const book = await getBook(id);
  if (book.availableCopies < book.totalCopies) {
    throw new ConflictError(`Cannot delete book ${id}: copies are currently on loan`);
  }
  await book.deleteOne();
}
