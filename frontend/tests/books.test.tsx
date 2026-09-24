import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { books, loanOf, member } from './fixtures.ts';
import { renderApp } from './render.tsx';
import { apiError, server } from './server.ts';

function card(title: string) {
  return screen.getByText(title).closest('li')!;
}

describe('the catalogue', () => {
  it('lists books with how many copies are available', async () => {
    renderApp('/');

    expect(await screen.findByText('The Pragmatic Programmer')).toBeInTheDocument();
    expect(within(card('The Pragmatic Programmer')).getByText('2 of 3 available')).toBeVisible();
    expect(within(card('Refactoring')).getByText('All copies on loan')).toBeVisible();
  });

  it('asks visitors to log in instead of showing Borrow buttons', async () => {
    renderApp('/');

    await screen.findByText('The Pragmatic Programmer');
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Log in' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /borrow/i })).not.toBeInTheDocument();
  });

  it('sends the search to the API', async () => {
    const searches: (string | null)[] = [];
    server.use(
      http.get('/api/books', ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search'));
        return HttpResponse.json([]);
      }),
    );
    const { user } = renderApp('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search books' }), 'fowler');

    expect(await screen.findByText('No books match your search.')).toBeVisible();
    expect(searches).toContain('fowler');
  });

  it('shows a clear message when the API is down', async () => {
    server.use(
      http.get('/api/books', () =>
        apiError(503, 'Service temporarily unavailable, please try again later'),
      ),
    );
    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load books: Service temporarily unavailable",
    );
  });
});

describe('borrowing', () => {
  it('borrows a book and shows when it is due', async () => {
    let borrowed = false;
    server.use(
      http.post('/api/users/:id/loans', async ({ request, params }) => {
        expect(params.id).toBe(member.id);
        expect(await request.json()).toEqual({ bookId: 'book-1' });
        expect(request.headers.get('Authorization')).toBe('Bearer test-token');
        borrowed = true;
        return HttpResponse.json(loanOf(books[0]!), { status: 201 });
      }),
      http.get('/api/users/:id/loans', () =>
        HttpResponse.json(borrowed ? [loanOf(books[0]!)] : []),
      ),
    );
    const { user } = renderApp('/', { as: member });

    await user.click(
      await screen.findByRole('button', { name: 'Borrow The Pragmatic Programmer' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /You borrowed “The Pragmatic Programmer”\. Please return it by/,
    );
    expect(
      await within(card('The Pragmatic Programmer')).findByText('You have this'),
    ).toBeVisible();
  });

  it('disables Borrow when every copy is on loan', async () => {
    renderApp('/', { as: member });

    expect(await screen.findByRole('button', { name: 'Borrow Refactoring' })).toBeDisabled();
  });

  it("shows the API's reason when a borrow is refused", async () => {
    server.use(
      http.post('/api/users/:id/loans', () =>
        apiError(409, 'No copies of book book-1 are available'),
      ),
    );
    const { user } = renderApp('/', { as: member });

    await user.click(
      await screen.findByRole('button', { name: 'Borrow The Pragmatic Programmer' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No copies of book book-1 are available',
    );
  });
});

describe('my loans', () => {
  it('lists current loans, warns about overdue ones, and returns a book', async () => {
    let returned = false;
    server.use(
      http.get('/api/users/:id/loans', () =>
        HttpResponse.json(
          returned
            ? [loanOf(books[0]!, { status: 'returned', returnedAt: '2026-09-24T10:00:00.000Z' })]
            : [loanOf(books[0]!, { overdue: true, dueAt: '2026-09-01T10:00:00.000Z' })],
        ),
      ),
      http.post('/api/users/:id/loans/:loanId/return', ({ params }) => {
        expect(params.loanId).toBe('loan-book-1');
        returned = true;
        return HttpResponse.json(loanOf(books[0]!, { status: 'returned' }));
      }),
    );
    const { user } = renderApp('/loans', { as: member });

    expect(await screen.findByText(/One of your books is overdue/)).toBeVisible();
    expect(screen.getByText(`Membership ID: ${member.membershipId}`)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Return The Pragmatic Programmer' }));

    expect(await screen.findByRole('heading', { name: 'History' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'On loan (0)' })).toBeVisible();
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
  });
});
