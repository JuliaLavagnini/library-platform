import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError, booksApi, unwrap } from '../../api/client.ts';
import type { Book, CreateBook } from '../../api/types.ts';
import { FormField } from '../../components/FormField.tsx';

export function ManageBooksPage() {
  const queryClient = useQueryClient();
  const refreshBooks = () => queryClient.invalidateQueries({ queryKey: ['books'] });

  const books = useQuery({
    queryKey: ['books', { search: '', availableOnly: false }],
    queryFn: () => unwrap(booksApi.GET('/api/books')),
  });

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addBook = useMutation({
    mutationFn: (body: CreateBook) => unwrap(booksApi.POST('/api/books', { body })),
    onSuccess: (book) => {
      setNotice({ type: 'success', text: `Added “${book.title}”.` });
      void refreshBooks();
    },
  });

  const updateCopies = useMutation({
    mutationFn: ({ id, totalCopies }: { id: string; totalCopies: number }) =>
      unwrap(
        booksApi.PATCH('/api/books/{id}', { params: { path: { id } }, body: { totalCopies } }),
      ),
    onSuccess: (book) => {
      setNotice({ type: 'success', text: `“${book.title}” now has ${book.totalCopies} copies.` });
      void refreshBooks();
    },
    onError: (error) => setNotice({ type: 'error', text: error.message }),
  });

  const deleteBook = useMutation({
    mutationFn: (book: Book) =>
      unwrap(booksApi.DELETE('/api/books/{id}', { params: { path: { id: book.id } } })),
    onSuccess: (_data, book) => {
      setNotice({ type: 'success', text: `Deleted “${book.title}”.` });
      void refreshBooks();
    },
    onError: (error, book) =>
      setNotice({
        type: 'error',
        text: error.message.includes('on loan')
          ? `“${book.title}” can't be deleted while copies are on loan.`
          : error.message,
      }),
  });

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const genre = String(form.get('genre')).trim();
    setNotice(null);
    addBook.mutate(
      {
        isbn: String(form.get('isbn')),
        title: String(form.get('title')),
        author: String(form.get('author')),
        totalCopies: Number(form.get('totalCopies')),
        ...(genre && { genre }),
      },
      { onSuccess: () => formElement.reset() },
    );
  }

  const addError = addBook.error instanceof ApiError ? addBook.error : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Manage books</h1>
          <p className="muted">Add books to the catalogue and change how many copies you own.</p>
        </div>
      </div>

      {notice && (
        <div
          className={`alert ${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
          style={{ marginBottom: '1rem' }}
        >
          {notice.text}
        </div>
      )}

      <section className="card" aria-labelledby="add-heading" style={{ marginBottom: '1.5rem' }}>
        <h2 id="add-heading">Add a book</h2>
        <form className="form" onSubmit={handleAdd} noValidate>
          {addError && addError.details.length === 0 && (
            <div className="alert error" role="alert">
              {addError.message === 'A record with this isbn already exists'
                ? 'A book with this ISBN is already in the catalogue.'
                : addError.message}
            </div>
          )}
          <div className="grid">
            <FormField
              label="ISBN"
              name="isbn"
              required
              hint="10 or 13 digits; hyphens are fine"
              error={addError?.fieldError('isbn')}
            />
            <FormField label="Title" name="title" required error={addError?.fieldError('title')} />
            <FormField
              label="Author"
              name="author"
              required
              error={addError?.fieldError('author')}
            />
            <FormField label="Genre" name="genre" hint="Optional" />
            <FormField
              label="Copies"
              name="totalCopies"
              type="number"
              min={1}
              defaultValue={1}
              required
              error={addError?.fieldError('totalCopies')}
            />
          </div>
          <div>
            <button type="submit" className="button" disabled={addBook.isPending}>
              {addBook.isPending ? 'Adding…' : 'Add book'}
            </button>
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby="catalogue-heading">
        <h2 id="catalogue-heading">Catalogue ({books.data?.length ?? 0})</h2>
        {books.isPending && <p className="muted">Loading…</p>}
        {books.isError && (
          <div className="alert error" role="alert">
            {books.error.message}
          </div>
        )}
        {books.data && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Author</th>
                  <th scope="col">ISBN</th>
                  <th scope="col">On shelf</th>
                  <th scope="col">Total copies</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {books.data.map((book) => (
                  <tr key={book.id}>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td className="muted">{book.isbn}</td>
                    <td>
                      {book.availableCopies}
                      {book.availableCopies < book.totalCopies && (
                        <span className="muted">
                          {' '}
                          ({book.totalCopies - book.availableCopies} on loan)
                        </span>
                      )}
                    </td>
                    <td>
                      <CopiesEditor
                        key={`${book.id}-${book.totalCopies}`}
                        book={book}
                        disabled={updateCopies.isPending}
                        onSave={(totalCopies) => updateCopies.mutate({ id: book.id, totalCopies })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button danger small"
                        disabled={deleteBook.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete “${book.title}” from the catalogue?`)) {
                            deleteBook.mutate(book);
                          }
                        }}
                        aria-label={`Delete ${book.title}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// A small number input with a Save button that only appears once the value changes.
function CopiesEditor({
  book,
  disabled,
  onSave,
}: {
  book: Book;
  disabled: boolean;
  onSave: (totalCopies: number) => void;
}) {
  const [value, setValue] = useState(String(book.totalCopies));
  const changed = Number(value) !== book.totalCopies && Number(value) >= 1;

  return (
    <form
      className="toolbar"
      style={{ flexWrap: 'nowrap' }}
      onSubmit={(event) => {
        event.preventDefault();
        if (changed) onSave(Number(value));
      }}
    >
      <label className="sr-only" htmlFor={`copies-${book.id}`}>
        Total copies of {book.title}
      </label>
      <input
        id={`copies-${book.id}`}
        type="number"
        min={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        style={{ width: '5rem' }}
      />
      {changed && (
        <button type="submit" className="button small" disabled={disabled}>
          Save
        </button>
      )}
    </form>
  );
}
