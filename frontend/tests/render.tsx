import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { User } from '../src/api/types.ts';
import { App } from '../src/App.tsx';

// Renders the whole app at a given URL, optionally logged in as a user, the same way the
// browser would after a page load. Returns Testing Library helpers and a user-event
// instance for clicking and typing.
export function renderApp(url = '/', { as }: { as?: User } = {}) {
  if (as) {
    sessionStorage.setItem(
      'library.session',
      JSON.stringify({ token: 'test-token', user: as, expiresAt: Date.now() + 15 * 60_000 }),
    );
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
