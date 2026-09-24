import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.ts';
import { ServiceUnavailableError } from '../../src/errors/http-errors.ts';
import { LoanModel } from '../../src/models/loan.model.ts';
import { FakeBookService } from './support/fake-book-service.ts';

// book-service is replaced by an in-memory fake with the same rules, so these tests can
// check both sides of every loan: the loan record here and the copy count "over there".
const bookService = vi.hoisted(() => ({ current: undefined as unknown as FakeBookService }));

vi.mock('../../src/clients/book.client.ts', () => ({
  borrowBookCopy: vi.fn((id: string) => bookService.current.borrowBookCopy(id)),
  returnBookCopy: vi.fn((id: string) => bookService.current.returnBookCopy(id)),
}));

const bookClient = await import('../../src/clients/book.client.ts');

const app = createApp();
const books = new FakeBookService();
bookService.current = books;

const cleanCode = '6ab476e7fd279464c59b87b6';
const refactoring = '6ab476e7fd279464c59b87b7';
const unknownId = '6ab463346d7baeb8a9d25a57';

beforeEach(() => {
  books.reset();
  books.addBook(cleanCode, 'Clean Code', 2);
  books.addBook(refactoring, 'Refactoring', 5);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function createUser(email = 'ada@example.com') {
  const res = await request(app)
    .post('/api/users')
    .send({ name: 'Member', email, password: 'correct horse battery staple' })
    .expect(201);
  return res.body.id as string;
}

async function borrow(userId: string, bookId: string, status = 201) {
  const res = await request(app).post(`/api/users/${userId}/loans`).send({ bookId }).expect(status);
  return res.body as { id: string; borrowedAt: string; dueAt: string; error?: { message: string } };
}

describe('borrowing a book', () => {
  it('records the loan with the title from book-service and a 14-day due date', async () => {
    const userId = await createUser();

    const loan = await borrow(userId, cleanCode);

    expect(loan).toMatchObject({
      userId,
      bookId: cleanCode,
      bookTitle: 'Clean Code',
      status: 'active',
      overdue: false,
      returnedAt: null,
    });
    const days = (Date.parse(loan.dueAt) - Date.parse(loan.borrowedAt)) / 86_400_000;
    expect(days).toBe(14);
    expect(books.availableCopies(cleanCode)).toBe(1);
  });

  it('refuses a second copy of the same book without touching book-service', async () => {
    const userId = await createUser();
    await borrow(userId, cleanCode);

    const res = await borrow(userId, cleanCode, 409);

    expect(res.error?.message).toBe('This member already has this book on loan');
    expect(bookClient.borrowBookCopy).toHaveBeenCalledTimes(1);
    expect(books.availableCopies(cleanCode)).toBe(1);
  });

  it('passes on book-service refusing when no copies are left', async () => {
    const ada = await createUser();
    const alan = await createUser('alan@example.com');
    const grace = await createUser('grace@example.com');
    await borrow(ada, cleanCode);
    await borrow(alan, cleanCode);

    const res = await borrow(grace, cleanCode, 409);

    expect(res.error?.message).toBe(`No copies of book ${cleanCode} are available`);
    expect(await LoanModel.countDocuments({ userId: grace })).toBe(0);
  });

  it('returns 404 for an unknown book', async () => {
    const userId = await createUser();
    await borrow(userId, unknownId, 404);
  });

  it('returns 404 for an unknown member without touching book-service', async () => {
    await borrow(unknownId, cleanCode, 404);
    expect(bookClient.borrowBookCopy).not.toHaveBeenCalled();
  });

  it('rejects a bookId that is not an id', async () => {
    const userId = await createUser();
    await request(app).post(`/api/users/${userId}/loans`).send({ bookId: '../admin' }).expect(400);
  });
});

describe('returning a book', () => {
  it('closes the loan and puts the copy back', async () => {
    const userId = await createUser();
    const loan = await borrow(userId, cleanCode);

    const res = await request(app).post(`/api/users/${userId}/loans/${loan.id}/return`).expect(200);

    expect(res.body).toMatchObject({ status: 'returned', overdue: false });
    expect(res.body.returnedAt).not.toBeNull();
    expect(books.availableCopies(cleanCode)).toBe(2);
  });

  it('refuses to return the same loan twice', async () => {
    const userId = await createUser();
    const loan = await borrow(userId, cleanCode);
    await request(app).post(`/api/users/${userId}/loans/${loan.id}/return`).expect(200);

    await request(app).post(`/api/users/${userId}/loans/${loan.id}/return`).expect(409);

    expect(books.availableCopies(cleanCode)).toBe(2);
  });

  it("does not let one member return another member's loan", async () => {
    const ada = await createUser();
    const alan = await createUser('alan@example.com');
    const loan = await borrow(ada, cleanCode);

    await request(app).post(`/api/users/${alan}/loans/${loan.id}/return`).expect(404);
  });

  it('returns 404 for a malformed loan id', async () => {
    const userId = await createUser();
    await request(app).post(`/api/users/${userId}/loans/abc/return`).expect(404);
  });

  it('allows borrowing the same book again after returning it', async () => {
    const userId = await createUser();
    const loan = await borrow(userId, cleanCode);
    await request(app).post(`/api/users/${userId}/loans/${loan.id}/return`).expect(200);

    await borrow(userId, cleanCode);
  });
});

describe('listing loans', () => {
  it("filters a member's loans by status, including overdue", async () => {
    const userId = await createUser();
    const returned = await borrow(userId, cleanCode);
    await request(app).post(`/api/users/${userId}/loans/${returned.id}/return`).expect(200);
    const late = await borrow(userId, refactoring);
    await LoanModel.updateOne({ _id: late.id }, { dueAt: new Date('2026-01-01') });

    const all = await request(app).get(`/api/users/${userId}/loans`).expect(200);
    const active = await request(app).get(`/api/users/${userId}/loans?status=active`).expect(200);
    const overdue = await request(app).get(`/api/users/${userId}/loans?status=overdue`).expect(200);

    expect(all.body).toHaveLength(2);
    expect(active.body.map((l: { id: string }) => l.id)).toEqual([late.id]);
    expect(overdue.body).toMatchObject([{ id: late.id, overdue: true }]);
  });

  it("returns 404 for an unknown member's loans", async () => {
    await request(app).get(`/api/users/${unknownId}/loans`).expect(404);
  });

  it('lists overdue loans across all members', async () => {
    const ada = await createUser();
    const alan = await createUser('alan@example.com');
    await borrow(ada, cleanCode);
    const late = await borrow(alan, refactoring);
    await LoanModel.updateOne({ _id: late.id }, { dueAt: new Date('2026-01-01') });

    const res = await request(app).get('/api/loans?status=overdue').expect(200);

    expect(res.body).toMatchObject([{ id: late.id, userId: alan }]);
  });
});

describe('keeping both services consistent', () => {
  it('hands the copy back when the loan cannot be recorded', async () => {
    const userId = await createUser();
    vi.spyOn(LoanModel, 'create').mockRejectedValueOnce(new Error('database write failed'));

    await borrow(userId, cleanCode, 500);

    expect(bookClient.returnBookCopy).toHaveBeenCalledWith(cleanCode);
    expect(books.availableCopies(cleanCode)).toBe(2);
  });

  it('reports the original error even if handing the copy back also fails', async () => {
    const userId = await createUser();
    vi.spyOn(LoanModel, 'create').mockRejectedValueOnce(new Error('database write failed'));
    vi.mocked(bookClient.returnBookCopy).mockRejectedValueOnce(
      new ServiceUnavailableError('Book service is unavailable, please try again later'),
    );

    const res = await borrow(userId, cleanCode, 500);

    expect(res.error?.message).toBe('Internal server error');
  });

  it('makes no loan when book-service is down', async () => {
    const userId = await createUser();
    vi.mocked(bookClient.borrowBookCopy).mockRejectedValueOnce(
      new ServiceUnavailableError('Book service is unavailable, please try again later'),
    );

    await borrow(userId, cleanCode, 503);

    expect(await LoanModel.countDocuments()).toBe(0);
  });

  it('reopens the loan if the copy cannot be put back, so the member can retry', async () => {
    const userId = await createUser();
    const loan = await borrow(userId, cleanCode);
    vi.mocked(bookClient.returnBookCopy).mockRejectedValueOnce(
      new ServiceUnavailableError('Book service is unavailable, please try again later'),
    );

    await request(app).post(`/api/users/${userId}/loans/${loan.id}/return`).expect(503);

    const reopened = await LoanModel.findById(loan.id);
    expect(reopened).toMatchObject({ status: 'active', returnedAt: null });
    expect(books.availableCopies(cleanCode)).toBe(1);

    await request(app).post(`/api/users/${userId}/loans/${loan.id}/return`).expect(200);
    expect(books.availableCopies(cleanCode)).toBe(2);
  });

  it('lends one copy when a member sends the same borrow several times at once', async () => {
    const userId = await createUser();

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app).post(`/api/users/${userId}/loans`).send({ bookId: refactoring }),
      ),
    );

    const statuses = responses.map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);
    expect(await LoanModel.countDocuments({ userId, status: 'active' })).toBe(1);
    // Requests that got past the first check took a copy, then gave it back.
    expect(books.availableCopies(refactoring)).toBe(4);
  });
});
