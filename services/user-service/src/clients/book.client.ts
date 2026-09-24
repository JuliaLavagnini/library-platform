import { z } from 'zod';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import {
  BadGatewayError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
} from '../errors/http-errors.ts';

// Only the fields this service needs; anything else in the response is ignored.
const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
});

const errorResponseSchema = z.object({
  error: z.object({ message: z.string() }),
});

export type BookSummary = z.infer<typeof bookSchema>;

async function postBookAction(bookId: string, action: 'borrow' | 'return'): Promise<BookSummary> {
  const url = `${env.BOOK_SERVICE_URL}/api/books/${encodeURIComponent(bookId)}/${action}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(env.BOOK_SERVICE_TIMEOUT_MS),
    });
  } catch (err) {
    logger.error({ err, url }, 'book-service request failed');
    throw new ServiceUnavailableError('Book service is unavailable, please try again later');
  }

  const body: unknown = await response.json().catch(() => null);

  if (response.ok) {
    const book = bookSchema.safeParse(body);
    if (!book.success) {
      throw new BadGatewayError('Book service returned an unexpected response');
    }
    return book.data;
  }

  if (response.status === 404) {
    throw new NotFoundError(`Book ${bookId} not found`);
  }
  if (response.status === 409) {
    const error = errorResponseSchema.safeParse(body);
    throw new ConflictError(error.success ? error.data.error.message : 'Book is not available');
  }

  logger.error({ status: response.status, url }, 'book-service returned an error');
  throw new BadGatewayError(`Book service responded with status ${response.status}`);
}

export function borrowBookCopy(bookId: string) {
  return postBookAction(bookId, 'borrow');
}

export function returnBookCopy(bookId: string) {
  return postBookAction(bookId, 'return');
}
