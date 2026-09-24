import { ConflictError, NotFoundError } from '../../../src/errors/http-errors.ts';

// An in-memory stand-in for book-service with the same rules as the real one: borrowing
// takes a copy off the shelf and fails with 409 when none are left. Tests use it to check
// that user-service keeps the two services consistent, including when something fails.

interface ShelfBook {
  title: string;
  totalCopies: number;
  availableCopies: number;
}

export class FakeBookService {
  private books = new Map<string, ShelfBook>();

  addBook(id: string, title: string, totalCopies: number) {
    this.books.set(id, { title, totalCopies, availableCopies: totalCopies });
  }

  availableCopies(id: string) {
    return this.find(id).availableCopies;
  }

  reset() {
    this.books.clear();
  }

  async borrowBookCopy(id: string) {
    const book = this.find(id);
    if (book.availableCopies === 0) {
      throw new ConflictError(`No copies of book ${id} are available`);
    }
    book.availableCopies -= 1;
    return { id, title: book.title };
  }

  async returnBookCopy(id: string) {
    const book = this.find(id);
    if (book.availableCopies === book.totalCopies) {
      throw new ConflictError(`All copies of book ${id} are already on the shelf`);
    }
    book.availableCopies += 1;
    return { id, title: book.title };
  }

  private find(id: string) {
    const book = this.books.get(id);
    if (!book) throw new NotFoundError(`Book ${id} not found`);
    return book;
  }
}
