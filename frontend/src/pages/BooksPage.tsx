import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { booksApi, unwrap } from '../api/client.ts';
import { Availability } from '../components/Availability.tsx';

export function BooksPage() {
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Books</h1>
          <p className="muted">Browse the catalogue. Log in to borrow.</p>
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
