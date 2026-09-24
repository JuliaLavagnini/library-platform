import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.ts';
import { UserModel } from '../../src/models/user.model.ts';
import { getServiceToken } from '../../src/services/token.service.ts';
import { bearer } from './support/auth.ts';

// Who may call what. Behaviour is covered elsewhere; these tests only check that each
// endpoint lets the right people in and keeps everyone else out.

vi.mock('../../src/clients/book.client.ts', () => ({
  borrowBookCopy: vi.fn(async (id: string) => ({ id, title: 'Clean Code' })),
  returnBookCopy: vi.fn(async (id: string) => ({ id, title: 'Clean Code' })),
}));

const app = createApp();
const bookId = '6ab476e7fd279464c59b87b6';

async function createMember(email: string) {
  const user = await UserModel.create({ name: 'Member', email });
  return { id: user.id as string, auth: await bearer('member', user.id) };
}

describe('without a token', () => {
  it.each([
    ['GET', '/api/users'],
    ['POST', '/api/users'],
    ['GET', `/api/users/${bookId}`],
    ['PATCH', `/api/users/${bookId}`],
    ['DELETE', `/api/users/${bookId}`],
    ['GET', `/api/users/${bookId}/loans`],
    ['POST', `/api/users/${bookId}/loans`],
    ['POST', `/api/users/${bookId}/loans/${bookId}/return`],
    ['GET', '/api/loans'],
  ])('%s %s returns 401', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path).expect(401);
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it.each(['/health', '/health/ready', '/.well-known/jwks.json', '/openapi.json'])(
    '%s stays public',
    async (path) => {
      await request(app).get(path).expect(200);
    },
  );
});

describe('a member', () => {
  it('can see and update their own profile', async () => {
    const ada = await createMember('ada@example.com');

    await request(app).get(`/api/users/${ada.id}`).set('Authorization', ada.auth).expect(200);
    await request(app)
      .patch(`/api/users/${ada.id}`)
      .set('Authorization', ada.auth)
      .send({ name: 'Augusta Ada King' })
      .expect(200);
  });

  it("cannot see or change another member's profile", async () => {
    const ada = await createMember('ada@example.com');
    const alan = await createMember('alan@example.com');

    await request(app).get(`/api/users/${alan.id}`).set('Authorization', ada.auth).expect(403);
    await request(app)
      .patch(`/api/users/${alan.id}`)
      .set('Authorization', ada.auth)
      .send({ email: 'stolen@example.com' })
      .expect(403);
  });

  it('can borrow, list and return their own loans', async () => {
    const ada = await createMember('ada@example.com');

    const loan = await request(app)
      .post(`/api/users/${ada.id}/loans`)
      .set('Authorization', ada.auth)
      .send({ bookId })
      .expect(201);
    await request(app).get(`/api/users/${ada.id}/loans`).set('Authorization', ada.auth).expect(200);
    await request(app)
      .post(`/api/users/${ada.id}/loans/${loan.body.id}/return`)
      .set('Authorization', ada.auth)
      .expect(200);
  });

  it('cannot borrow, list or return loans for someone else', async () => {
    const ada = await createMember('ada@example.com');
    const alan = await createMember('alan@example.com');
    const alansLoan = await request(app)
      .post(`/api/users/${alan.id}/loans`)
      .set('Authorization', alan.auth)
      .send({ bookId })
      .expect(201);

    await request(app)
      .post(`/api/users/${alan.id}/loans`)
      .set('Authorization', ada.auth)
      .send({ bookId })
      .expect(403);
    await request(app)
      .get(`/api/users/${alan.id}/loans`)
      .set('Authorization', ada.auth)
      .expect(403);
    await request(app)
      .post(`/api/users/${alan.id}/loans/${alansLoan.body.id}/return`)
      .set('Authorization', ada.auth)
      .expect(403);
  });

  it.each([
    ['list all members', 'get', '/api/users'],
    ['create accounts', 'post', '/api/users'],
    ['see all loans', 'get', '/api/loans'],
  ] as const)('cannot %s', async (_label, method, path) => {
    const ada = await createMember('ada@example.com');
    await request(app)[method](path).set('Authorization', ada.auth).expect(403);
  });

  it('cannot delete accounts, not even their own', async () => {
    const ada = await createMember('ada@example.com');
    await request(app).delete(`/api/users/${ada.id}`).set('Authorization', ada.auth).expect(403);
  });
});

describe('a librarian', () => {
  it('can create another librarian account', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', await bearer('librarian'))
      .send({
        name: 'Grace Hopper',
        email: 'grace@library.test',
        password: 'correct horse battery staple',
        role: 'librarian',
      })
      .expect(201);

    expect(res.body.role).toBe('librarian');
  });

  it("can act on any member's loans at the desk", async () => {
    const ada = await createMember('ada@example.com');

    await request(app)
      .post(`/api/users/${ada.id}/loans`)
      .set('Authorization', await bearer('librarian'))
      .send({ bookId })
      .expect(201);
  });
});

describe('the service token', () => {
  it('only works between services, not on user endpoints', async () => {
    const auth = `Bearer ${await getServiceToken()}`;

    await request(app).get('/api/users').set('Authorization', auth).expect(403);
    await request(app).get('/api/loans').set('Authorization', auth).expect(403);
  });
});
