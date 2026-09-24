import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { books, librarian, loanOf, member } from './fixtures.ts';
import { renderApp } from './render.tsx';
import { apiError, server } from './server.ts';

describe('manage books', () => {
  it('adds a book and shows field errors from the API first', async () => {
    let attempts = 0;
    server.use(
      http.post('/api/books', async ({ request }) => {
        attempts++;
        const body = (await request.json()) as { isbn: string; title: string };
        if (attempts === 1) {
          return apiError(400, 'Validation failed', [
            { path: 'isbn', message: 'ISBN must have 10 or 13 digits (ISBN-10 may end in X)' },
          ]);
        }
        return HttpResponse.json({ ...books[0]!, id: 'book-3', ...body }, { status: 201 });
      }),
    );
    const { user } = renderApp('/librarian/books', { as: librarian });

    await user.type(await screen.findByLabelText('ISBN'), '12345');
    await user.type(screen.getByLabelText('Title'), 'Test-Driven Development');
    await user.type(screen.getByLabelText('Author'), 'Kent Beck');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText(/ISBN must have 10 or 13 digits/)).toBeVisible();

    await user.clear(screen.getByLabelText('ISBN'));
    await user.type(screen.getByLabelText('ISBN'), '978-0-321-14653-3');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Added “Test-Driven Development”.');
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('explains why a book with copies on loan cannot be deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.delete('/api/books/:id', () =>
        apiError(409, 'Cannot delete book book-2: copies are currently on loan'),
      ),
    );
    const { user } = renderApp('/librarian/books', { as: librarian });

    await user.click(await screen.findByRole('button', { name: 'Delete Refactoring' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "“Refactoring” can't be deleted while copies are on loan.",
    );
  });
});

describe('all loans', () => {
  it('shows overdue loans with the member who has the book', async () => {
    server.use(
      http.get('/api/loans', ({ request }) => {
        expect(new URL(request.url).searchParams.get('status')).toBe('overdue');
        return HttpResponse.json([loanOf(books[0]!, { overdue: true })]);
      }),
      http.get('/api/users', () => HttpResponse.json([member, librarian])),
    );
    renderApp('/librarian/loans', { as: librarian });

    const row = (await screen.findByText('The Pragmatic Programmer')).closest('tr')!;
    expect(within(row).getByText('Ada Lovelace')).toBeVisible();
    expect(within(row).getByText(/Overdue/)).toBeVisible();
    expect(within(row).getByRole('button', { name: /Mark .* as returned/ })).toBeEnabled();
  });
});

describe('members', () => {
  it("doesn't let librarians delete their own account", async () => {
    server.use(http.get('/api/users', () => HttpResponse.json([member, librarian])));
    renderApp('/librarian/members', { as: librarian });

    expect(await screen.findByRole('button', { name: 'Delete Ada Lovelace' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Delete Grace Hopper' })).not.toBeInTheDocument();
  });
});
