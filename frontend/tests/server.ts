import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { books } from './fixtures.ts';

// A fake API at the network level: the app's real API client sends real requests, and
// these handlers answer them. Tests override handlers with server.use(...).

export function apiError(status: number, message: string, details?: unknown[]) {
  return HttpResponse.json({ error: { message, ...(details && { details }) } }, { status });
}

export const server = setupServer(
  http.get('/api/books', () => HttpResponse.json(books)),
  http.get('/api/users/:id/loans', () => HttpResponse.json([])),
);
