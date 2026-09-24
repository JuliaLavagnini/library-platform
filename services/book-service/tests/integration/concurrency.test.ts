import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.ts';
import { BookModel } from '../../src/models/book.model.ts';
import * as bookService from '../../src/services/book.service.ts';

// These tests prove the guarantees that the coursework version got wrong:
// copy counts stay correct when many requests arrive at the same time.

const app = createApp();

afterEach(() => {
  vi.restoreAllMocks();
});

async function createBook(totalCopies: number) {
  const res = await request(app)
    .post('/api/books')
    .send({ isbn: '9780135957059', title: 'Clean Code', author: 'Robert C. Martin', totalCopies })
    .expect(201);
  return res.body.id as string;
}

function statusCounts(responses: { status: number }[]) {
  return responses.reduce<Record<number, number>>((counts, { status }) => {
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

describe('concurrent borrowing', () => {
  it('never lends more copies than exist', async () => {
    const id = await createBook(3);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request(app).post(`/api/books/${id}/borrow`)),
    );

    expect(statusCounts(responses)).toEqual({ 200: 3, 409: 7 });
    const book = await BookModel.findById(id);
    expect(book?.availableCopies).toBe(0);
  });

  it('never returns more copies than were lent', async () => {
    const id = await createBook(3);
    await request(app).post(`/api/books/${id}/borrow`).expect(200);
    await request(app).post(`/api/books/${id}/borrow`).expect(200);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post(`/api/books/${id}/return`)),
    );

    expect(statusCounts(responses)).toEqual({ 200: 2, 409: 3 });
    const book = await BookModel.findById(id);
    expect(book?.availableCopies).toBe(3);
  });
});

describe('edits that race with a borrow', () => {
  it('rejects a save based on data read before the borrow', async () => {
    const id = await createBook(3);

    const staleCopy = await BookModel.findById(id); // an edit reads the book...
    await bookService.borrowCopy(id); // ...a borrow happens meanwhile...
    staleCopy!.availableCopies = 3; // ...and the edit tries to save old numbers.

    await expect(staleCopy!.save()).rejects.toThrow(/No matching document found/);

    const book = await BookModel.findById(id);
    expect(book?.availableCopies).toBe(2);
  });

  it('reports the conflict to the client as 409', async () => {
    const id = await createBook(3);
    const staleCopy = await BookModel.findById(id);
    await bookService.borrowCopy(id);

    // Make the read inside updateBook return the stale document, as if the borrow
    // landed between the edit's read and its save.
    vi.spyOn(BookModel, 'findById').mockReturnValueOnce(Promise.resolve(staleCopy) as never);

    const res = await request(app).patch(`/api/books/${id}`).send({ totalCopies: 4 }).expect(409);

    expect(res.body.error.message).toMatch(/changed by another request/);
  });
});
