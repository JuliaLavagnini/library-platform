import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router';
import { booksApi, unwrap } from '../api/client.ts';
import { useBorrowBook, useMemberLoans } from '../api/loans.ts';
import type { Book } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { Availability } from '../components/Availability.tsx';
import { formatDate } from '../format.ts';

export function BooksPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  // Waits for the user to pause typing before searching, without a manual debounce.
  const deferredSearch = useDeferredValue(search.trim());

  const books = useQuery({
    queryKey: ['books', { search: deferredSearch, availableOnly }],
    queryFn: () =>
      unwrap(
        booksApi.GET('/api/books', {
          params: {
            query: {
              ...(deferredSearch && { search: deferredSearch }),
              ...(availableOnly && { available: 'true' as const }),
            },
          },
        }),
      ),
    placeholderData: (previous) => previous,
  });

  // The logged-in member's active loans, to show "You have this" instead of "Borrow".
  const loans = useMemberLoans(user?.id);
  const onLoanToMe = new Set(
    loans.data?.filter((loan) => loan.status === 'active').map((loan) => loan.bookId),
  );

  const borrow = useBorrowBook();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleBorrow(book: Book) {
    if (!user) return;
    setMessage(null);
    borrow.mutate(
      { userId: user.id, bookId: book.id },
      {
        onSuccess: (loan) =>
          setMessage({
            type: 'success',
            text: `You borrowed “${book.title}”. Please return it by ${formatDate(loan.dueAt)}.`,
          }),
        onError: (error) => setMessage({ type: 'error', text: error.message }),
      },
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Books</h1>
          <p className="muted">
            {user ? (
              'Browse the catalogue and borrow up to one copy of each book.'
            ) : (
              <>
                Browse the catalogue. <Link to="/login">Log in</Link> to borrow.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: '1.5rem' }}>
        <label className="sr-only" htmlFor="book-search">
          Search books
        </label>
        <input
          id="book-search"
          type="search"
          placeholder="Search by title or author"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(event) => setAvailableOnly(event.target.checked)}
          />
          Available now
        </label>
      </div>

      {message && (
        <div
          className={`alert ${message.type}`}
          role={message.type === 'error' ? 'alert' : 'status'}
          style={{ marginBottom: '1rem' }}
        >
          {message.text}
          {message.type === 'success' && (
            <>
              {' '}
              <Link to="/loans">See my loans</Link>
            </>
          )}
        </div>
      )}

      {books.isPending && <p className="muted">Loading books…</p>}

      {books.isError && (
        <div className="alert error" role="alert">
          Couldn't load books: {books.error.message}
        </div>
      )}

      {books.data?.length === 0 && (
        <div className="card empty">
          {deferredSearch || availableOnly
            ? 'No books match your search.'
            : 'The catalogue is empty.'}
        </div>
      )}

      {books.data && books.data.length > 0 && (
        <ul className="grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {books.data.map((book) => (
            <li key={book.id} className="card book-card">
              <span className="title">{book.title}</span>
              <span className="meta">
                {book.author}
                {book.genre && ` · ${book.genre}`}
              </span>
              <div className="actions">
                <Availability book={book} />
                {user &&
                  (onLoanToMe.has(book.id) ? (
                    <span className="badge neutral">You have this</span>
                  ) : (
                    <button
                      type="button"
                      className="button small"
                      disabled={book.availableCopies === 0 || borrow.isPending}
                      onClick={() => handleBorrow(book)}
                      aria-label={`Borrow ${book.title}`}
                    >
                      Borrow
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
