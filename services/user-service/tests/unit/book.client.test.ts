import { afterEach, describe, expect, it, vi } from 'vitest';
import { borrowBookCopy, returnBookCopy } from '../../src/clients/book.client.ts';
import {
  BadGatewayError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
} from '../../src/errors/http-errors.ts';

const bookId = '6ab476e7fd279464c59b87b6';

// Replaces the global fetch so each test decides what book-service "replies".
function fakeFetch(respond: () => Response | Error) {
  // A new Response per call: a response body can only be read once.
  const fetchMock = vi.fn<typeof fetch>(() => {
    const response = respond();
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('book client', () => {
  it('sends a POST to the borrow and return endpoints', async () => {
    const fetchMock = fakeFetch(() => jsonResponse(200, { id: bookId, title: 'Clean Code' }));

    await borrowBookCopy(bookId);
    await returnBookCopy(bookId);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `http://localhost:8080/api/books/${bookId}/borrow`,
      `http://localhost:8080/api/books/${bookId}/return`,
    ]);
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === 'POST')).toBe(true);
  });

  it('returns only the fields this service needs', async () => {
    fakeFetch(() => jsonResponse(200, { id: bookId, title: 'Clean Code', availableCopies: 2 }));

    await expect(borrowBookCopy(bookId)).resolves.toEqual({ id: bookId, title: 'Clean Code' });
  });

  it('turns a 404 into NotFoundError', async () => {
    fakeFetch(() => jsonResponse(404, { error: { message: 'Book not found' } }));

    await expect(borrowBookCopy(bookId)).rejects.toThrow(NotFoundError);
  });

  it("passes book-service's 409 message through to the client", async () => {
    fakeFetch(() => jsonResponse(409, { error: { message: 'No copies of book x are available' } }));

    const error = await borrowBookCopy(bookId).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as Error).message).toBe('No copies of book x are available');
  });

  it('uses a generic message when a 409 has no readable body', async () => {
    fakeFetch(() => new Response('conflict', { status: 409 }));

    await expect(borrowBookCopy(bookId)).rejects.toThrow('Book is not available');
  });

  it('turns an unexpected status into BadGatewayError (502)', async () => {
    fakeFetch(() => jsonResponse(500, { error: { message: 'Internal server error' } }));

    await expect(borrowBookCopy(bookId)).rejects.toThrow(BadGatewayError);
  });

  it('rejects a success response with the wrong shape (502)', async () => {
    fakeFetch(() => jsonResponse(200, { unexpected: true }));

    await expect(borrowBookCopy(bookId)).rejects.toThrow(BadGatewayError);
  });

  it('turns a network failure into ServiceUnavailableError (503)', async () => {
    fakeFetch(() => new TypeError('fetch failed'));

    await expect(borrowBookCopy(bookId)).rejects.toThrow(ServiceUnavailableError);
  });

  it('turns a timeout into ServiceUnavailableError (503)', async () => {
    fakeFetch(() => new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

    await expect(returnBookCopy(bookId)).rejects.toThrow(ServiceUnavailableError);
  });

  it('gives up on a slow response instead of waiting forever', async () => {
    const fetchMock = fakeFetch(() => jsonResponse(200, { id: bookId, title: 'Clean Code' }));

    await borrowBookCopy(bookId);

    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
