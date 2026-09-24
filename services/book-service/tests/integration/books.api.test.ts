import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { BookModel } from '../../src/models/book.model.ts';

const app = createApp();

const pragmatic = {
  isbn: '978-0-13-595705-9',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  genre: 'Software',
  totalCopies: 3,
};

async function createBook(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/books')
    .send({ ...pragmatic, ...overrides })
    .expect(201);
  return res.body as { id: string; availableCopies: number; totalCopies: number };
}

// Simulates copies being out on loan without going through the borrow endpoint.
async function setAvailableCopies(id: string, availableCopies: number) {
  await BookModel.updateOne({ _id: id }, { availableCopies });
}

const unknownId = '6ab463346d7baeb8a9d25a57';

describe('health checks', () => {
  it('reports liveness', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'book-service' });
  });

  it('reports readiness when the database is connected', async () => {
    const res = await request(app).get('/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ready', checks: { database: 'up' } });
  });
});

describe('POST /api/books', () => {
  it('creates a book with every copy available', async () => {
    const res = await request(app).post('/api/books').send(pragmatic).expect(201);

    expect(res.body).toMatchObject({
      isbn: '9780135957059',
      title: 'The Pragmatic Programmer',
      totalCopies: 3,
      availableCopies: 3,
    });
    expect(res.headers.location).toBe(`/api/books/${res.body.id}`);
  });

  it('rejects a duplicate ISBN, even written differently', async () => {
    await createBook();
    const res = await request(app)
      .post('/api/books')
      .send({ ...pragmatic, isbn: '9780135957059', title: 'Copy' })
      .expect(409);
    expect(res.body.error.message).toBe('A record with this isbn already exists');
  });

  it('returns every validation problem at once', async () => {
    const res = await request(app).post('/api/books').send({ isbn: '123' }).expect(400);

    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['isbn', 'title', 'author', 'totalCopies']),
    );
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Content-Type', 'application/json')
      .send('{"title": ')
      .expect(400);
    expect(res.body.error.message).toBe('Malformed JSON in request body');
  });

  it('rejects a request with no body', async () => {
    await request(app).post('/api/books').expect(400);
  });
});

describe('GET /api/books', () => {
  it('lists books sorted by title', async () => {
    await createBook({ isbn: '0306406152', title: 'Refactoring', author: 'Martin Fowler' });
    await createBook();

    const res = await request(app).get('/api/books').expect(200);

    expect(res.body.map((b: { title: string }) => b.title)).toEqual([
      'Refactoring',
      'The Pragmatic Programmer',
    ]);
  });

  it('searches title and author, ignoring case', async () => {
    await createBook();
    await createBook({ isbn: '0306406152', title: 'Refactoring', author: 'Martin Fowler' });

    const byTitle = await request(app).get('/api/books?search=PRAGMATIC').expect(200);
    const byAuthor = await request(app).get('/api/books?search=fowler').expect(200);

    expect(byTitle.body).toHaveLength(1);
    expect(byAuthor.body[0].title).toBe('Refactoring');
  });

  it('treats regex characters in a search as plain text', async () => {
    await createBook({ title: 'C++ (Primer)' });

    const res = await request(app).get('/api/books').query({ search: '++ (' }).expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('filters to books with copies available', async () => {
    const { id } = await createBook();
    await createBook({ isbn: '0306406152', title: 'Refactoring' });
    await setAvailableCopies(id, 0);

    const res = await request(app).get('/api/books?available=true').expect(200);

    expect(res.body.map((b: { title: string }) => b.title)).toEqual(['Refactoring']);
  });

  it('rejects an invalid filter', async () => {
    await request(app).get('/api/books?available=maybe').expect(400);
  });
});

describe('GET /api/books/:id', () => {
  it('returns the book', async () => {
    const { id } = await createBook();
    const res = await request(app).get(`/api/books/${id}`).expect(200);
    expect(res.body).toMatchObject({ id, title: 'The Pragmatic Programmer' });
  });

  it.each([
    ['an unknown id', unknownId],
    ['a malformed id', 'not-an-id'],
  ])('returns 404 for %s', async (_label, id) => {
    const res = await request(app).get(`/api/books/${id}`).expect(404);
    expect(res.body.error.message).toBe(`Book ${id} not found`);
  });
});

describe('PATCH /api/books/:id', () => {
  it('changes only the fields sent', async () => {
    const { id } = await createBook();

    const res = await request(app)
      .patch(`/api/books/${id}`)
      .send({ title: 'The Pragmatic Programmer, 2nd Edition' })
      .expect(200);

    expect(res.body).toMatchObject({
      title: 'The Pragmatic Programmer, 2nd Edition',
      author: 'David Thomas',
      isbn: '9780135957059',
      genre: 'Software',
    });
  });

  it('keeps copies on loan when total copies change', async () => {
    const { id } = await createBook({ totalCopies: 3 });
    await setAvailableCopies(id, 1); // 2 on loan

    const res = await request(app).patch(`/api/books/${id}`).send({ totalCopies: 5 }).expect(200);

    expect(res.body).toMatchObject({ totalCopies: 5, availableCopies: 3 });
  });

  it('refuses to reduce total copies below the number on loan', async () => {
    const { id } = await createBook({ totalCopies: 3 });
    await setAvailableCopies(id, 1); // 2 on loan

    const res = await request(app).patch(`/api/books/${id}`).send({ totalCopies: 1 }).expect(409);

    expect(res.body.error.message).toMatch(/2 copies are currently on loan/);
  });

  it('rejects an empty update', async () => {
    const { id } = await createBook();
    await request(app).patch(`/api/books/${id}`).send({}).expect(400);
  });

  it('returns 404 for an unknown book', async () => {
    await request(app).patch(`/api/books/${unknownId}`).send({ title: 'x' }).expect(404);
  });
});

describe('DELETE /api/books/:id', () => {
  it('deletes a book with no copies on loan', async () => {
    const { id } = await createBook();

    await request(app).delete(`/api/books/${id}`).expect(204);
    await request(app).get(`/api/books/${id}`).expect(404);
  });

  it('refuses to delete a book with copies on loan', async () => {
    const { id } = await createBook();
    await setAvailableCopies(id, 2);

    await request(app).delete(`/api/books/${id}`).expect(409);
    await request(app).get(`/api/books/${id}`).expect(200);
  });
});

describe('POST /api/books/:id/borrow and /return', () => {
  it('takes a copy off the shelf and puts it back', async () => {
    const { id } = await createBook({ totalCopies: 2 });

    const borrowed = await request(app).post(`/api/books/${id}/borrow`).expect(200);
    expect(borrowed.body.availableCopies).toBe(1);

    const returned = await request(app).post(`/api/books/${id}/return`).expect(200);
    expect(returned.body.availableCopies).toBe(2);
  });

  it('refuses to borrow when no copies are left', async () => {
    const { id } = await createBook({ totalCopies: 1 });
    await request(app).post(`/api/books/${id}/borrow`).expect(200);

    const res = await request(app).post(`/api/books/${id}/borrow`).expect(409);

    expect(res.body.error.message).toBe(`No copies of book ${id} are available`);
  });

  it('refuses to return when every copy is already on the shelf', async () => {
    const { id } = await createBook();
    await request(app).post(`/api/books/${id}/return`).expect(409);
  });

  it.each(['borrow', 'return'])('returns 404 when trying to %s an unknown book', async (action) => {
    await request(app).post(`/api/books/${unknownId}/${action}`).expect(404);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await request(app).get('/api/nothing-here').expect(404);
    expect(res.body.error.message).toBe('Route GET /api/nothing-here not found');
  });
});
