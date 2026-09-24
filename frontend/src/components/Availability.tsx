import type { Book } from '../api/types.ts';

export function Availability({ book }: { book: Book }) {
  if (book.availableCopies === 0) {
    return <span className="badge danger">All copies on loan</span>;
  }
  return (
    <span className={`badge ${book.availableCopies === 1 ? 'warning' : 'success'}`}>
      {book.availableCopies} of {book.totalCopies} available
    </span>
  );
}
