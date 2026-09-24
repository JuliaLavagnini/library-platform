import { generateKeyPairSync } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { BookModel } from '../../src/models/book.model.ts';
import { bearer, signTestToken, testKeySet } from '../support/auth.ts';

// Who may call what. Behaviour is covered elsewhere; these tests only check that each
// endpoint lets the right people in and keeps everyone else out.

const app = createApp({ keySet: testKeySet });

async function createBook() {
  const book = await BookModel.create({
    isbn: '9780135957059',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    totalCopies: 2,
    availableCopies: 1,
  });
  return book.id as string;
}

const newBook = {
  isbn: '0306406152',
  title: 'Refactoring',
  author: 'Martin Fowler',
  totalCopies: 1,
};

describe('browsing the catalogue', () => {
  it('needs no token', async () => {
    const id = await createBook();

    await request(app).get('/api/books').expect(200);
    await request(app).get(`/api/books/${id}`).expect(200);
  });
});

describe('managing books', () => {
  it('works for a librarian', async () => {
    const auth = await bearer('librarian');

    const created = await request(app)
      .post('/api/books')
      .set('Authorization', auth)
      .send(newBook)
      .expect(201);
    await request(app)
      .patch(`/api/books/${created.body.id}`)
      .set('Authorization', auth)
      .send({ genre: 'Software' })
      .expect(200);
    await request(app)
      .delete(`/api/books/${created.body.id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('is refused without a token (401)', async () => {
    const id = await createBook();

    const res = await request(app).post('/api/books').send(newBook).expect(401);
    await request(app).patch(`/api/books/${id}`).send({ genre: 'x' }).expect(401);
    await request(app).delete(`/api/books/${id}`).expect(401);

    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it.each(['member', 'service'] as const)('is refused for a %s (403)', async (role) => {
    const id = await createBook();
    const auth = await bearer(role);

    await request(app).post('/api/books').set('Authorization', auth).send(newBook).expect(403);
    await request(app)
      .patch(`/api/books/${id}`)
      .set('Authorization', auth)
      .send({ genre: 'x' })
      .expect(403);
    await request(app).delete(`/api/books/${id}`).set('Authorization', auth).expect(403);
  });
});

describe('taking and returning copies', () => {
  it('works for user-service', async () => {
    const id = await createBook();
    const auth = await bearer('service');

    await request(app).post(`/api/books/${id}/borrow`).set('Authorization', auth).expect(200);
    await request(app).post(`/api/books/${id}/return`).set('Authorization', auth).expect(200);
  });

  // Otherwise a member could take copies off the shelf without any loan being recorded.
  it.each(['member', 'librarian'] as const)('is refused for a %s', async (role) => {
    const id = await createBook();
    const auth = await bearer(role);

    await request(app).post(`/api/books/${id}/borrow`).set('Authorization', auth).expect(403);
    await request(app).post(`/api/books/${id}/return`).set('Authorization', auth).expect(403);

    const book = await BookModel.findById(id);
    expect(book?.availableCopies).toBe(1);
  });
});

describe('invalid tokens', () => {
  const attackerKey = generateKeyPairSync('ed25519').privateKey;

  it.each([
    ['signed by an unknown key', () => signTestToken('librarian', { key: attackerKey })],
    ['expired', () => signTestToken('librarian', { expiresIn: '-1m' })],
    ['from another issuer', () => signTestToken('librarian', { issuer: 'someone-else' })],
    ['for another audience', () => signTestToken('librarian', { audience: 'another-app' })],
    ['with an unknown role', () => signTestToken('admin')],
  ])('rejects a token %s with 401', async (_label, makeToken) => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${await makeToken()}`)
      .send(newBook)
      .expect(401);

    expect(res.body.error.message).toBe('Invalid or expired token');
  });
});

describe('when user-service keys cannot be fetched', () => {
  it('answers 503, not 401: the token may be perfectly valid', async () => {
    const unreachable = createApp({
      keySet: async () => {
        throw new TypeError('fetch failed');
      },
    });

    const res = await request(unreachable)
      .post('/api/books')
      .set('Authorization', await bearer('librarian'))
      .send(newBook)
      .expect(503);

    expect(res.body.error.message).toBe('Cannot verify tokens right now, please try again later');
  });
});
