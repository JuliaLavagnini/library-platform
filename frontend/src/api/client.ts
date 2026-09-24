import createClient, { type Middleware } from 'openapi-fetch';
import type { paths as BookPaths } from './generated/books.ts';
import type { paths as UserPaths } from './generated/users.ts';

// Typed clients for both services. Every path, parameter, request body and response is
// checked against the types generated from the services' OpenAPI documents.
// All requests go to the same origin: the API gateway routes them to the right service.

let accessToken: string | null = null;
let onUnauthorized: (() => void) | undefined;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Called when the API rejects the current token (expired or revoked), so the app can
// log the user out instead of showing confusing errors.
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401 && accessToken) {
      onUnauthorized?.();
    }
    return response;
  },
};

// openapi-fetch needs an absolute URL; in the browser that's this page's origin.
const baseUrl = globalThis.location?.origin ?? 'http://localhost';

// Look fetch up on every request rather than once at startup, so anything that wraps it
// later (like the test suite's fake API) is used.
const fetchNow: typeof fetch = (input, init) => globalThis.fetch(input, init);

export const booksApi = createClient<BookPaths>({ baseUrl, fetch: fetchNow });
export const usersApi = createClient<UserPaths>({ baseUrl, fetch: fetchNow });
booksApi.use(authMiddleware);
usersApi.use(authMiddleware);

interface ErrorBody {
  error?: { message?: string; details?: { path: string; message: string }[] };
}

// One error type for every failed API call, carrying the service's message and any
// per-field validation problems.
export class ApiError extends Error {
  readonly status: number;
  readonly details: { path: string; message: string }[];

  constructor(status: number, body: unknown) {
    const error = (body as ErrorBody | undefined)?.error;
    super(error?.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = error?.details ?? [];
  }

  // The message for one form field, if validation failed on it.
  fieldError(path: string) {
    return this.details.find((detail) => detail.path === path)?.message;
  }
}

// Returns the data of a successful response, or throws an ApiError.
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok) {
    throw new ApiError(response.status, error);
  }
  return data as T;
}
