import request from 'supertest';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { bearer } from './support/auth.ts';
import { LoanModel } from '../../src/models/loan.model.ts';

const app = createApp();

// These tests cover behaviour, so they act as a librarian, who may do everything.
// The access rules themselves are tested in access.api.test.ts.
const api = request.agent(app).set('Authorization', await bearer('librarian'));

const unknownId = '6ab463346d7baeb8a9d25a57';
const password = 'correct horse battery staple';

async function createUser(name = 'Ada Lovelace', email = 'ada@example.com') {
  const res = await api.post('/api/users').send({ name, email, password }).expect(201);
  return res.body as { id: string; membershipId: string };
}

describe('health checks', () => {
  it('reports readiness when the database is connected', async () => {
    const res = await api.get('/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ready', checks: { database: 'up' } });
  });
});

describe('POST /api/users', () => {
  it('registers a member with a generated membership ID', async () => {
    const res = await api
      .post('/api/users')
      .send({ name: '  Ada Lovelace ', email: ' Ada@Example.COM ', password })
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'member',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body.membershipId).toMatch(/^MBR-[0-9A-F]{8}$/);
    expect(res.headers.location).toBe(`/api/users/${res.body.id}`);
  });

  it('gives every member a different membership ID', async () => {
    const ada = await createUser();
    const alan = await createUser('Alan Turing', 'alan@example.com');
    expect(ada.membershipId).not.toBe(alan.membershipId);
  });

  it('rejects an email that is already registered, whatever its case', async () => {
    await createUser();
    const res = await api
      .post('/api/users')
      .send({ name: 'Someone Else', email: 'ADA@example.com', password })
      .expect(409);
    expect(res.body.error.message).toBe('A record with this email already exists');
  });

  it('rejects invalid input', async () => {
    const res = await api.post('/api/users').send({ email: 'nope' }).expect(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['name', 'email']),
    );
  });
});

describe('GET /api/users', () => {
  it('lists members sorted by name', async () => {
    await createUser('Grace Hopper', 'grace@example.com');
    await createUser();

    const res = await api.get('/api/users').expect(200);

    expect(res.body.map((u: { name: string }) => u.name)).toEqual(['Ada Lovelace', 'Grace Hopper']);
  });

  it('searches name, email and membership ID', async () => {
    const ada = await createUser();
    await createUser('Alan Turing', 'alan@example.com');

    const byName = await api.get('/api/users?search=lovelace').expect(200);
    const byEmail = await api.get('/api/users?search=alan@').expect(200);
    const byMembership = await api.get(`/api/users?search=${ada.membershipId}`);

    expect(byName.body).toHaveLength(1);
    expect(byEmail.body[0].name).toBe('Alan Turing');
    expect(byMembership.body[0].id).toBe(ada.id);
  });
});

describe('GET /api/users/:id', () => {
  it('returns the member', async () => {
    const { id } = await createUser();
    await api.get(`/api/users/${id}`).expect(200);
  });

  it.each([unknownId, 'not-an-id'])('returns 404 for %s', async (id) => {
    await api.get(`/api/users/${id}`).expect(404);
  });
});

describe('PATCH /api/users/:id', () => {
  it('changes only the fields sent and never the membership ID', async () => {
    const ada = await createUser();

    const res = await api
      .patch(`/api/users/${ada.id}`)
      .send({ name: 'Augusta Ada King' })
      .expect(200);

    expect(res.body).toMatchObject({
      name: 'Augusta Ada King',
      email: 'ada@example.com',
      membershipId: ada.membershipId,
    });
  });

  it('rejects an attempt to change the membership ID', async () => {
    const { id } = await createUser();
    await api.patch(`/api/users/${id}`).send({ membershipId: 'MBR-HACKED00' }).expect(400);
  });

  it("rejects taking another member's email", async () => {
    await createUser();
    const alan = await createUser('Alan Turing', 'alan@example.com');

    await api.patch(`/api/users/${alan.id}`).send({ email: 'ada@example.com' }).expect(409);
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes a member with no books on loan', async () => {
    const { id } = await createUser();

    await api.delete(`/api/users/${id}`).expect(204);
    await api.get(`/api/users/${id}`).expect(404);
  });

  it('refuses to delete a member who still has a book on loan', async () => {
    const { id } = await createUser();
    await LoanModel.create({
      userId: id,
      bookId: new Types.ObjectId().toString(),
      bookTitle: 'Clean Code',
      dueAt: new Date(Date.now() + 86_400_000),
    });

    const res = await api.delete(`/api/users/${id}`).expect(409);

    expect(res.body.error.message).toMatch(/still have books on loan/);
  });

  it('allows deleting a member whose loans are all returned', async () => {
    const { id } = await createUser();
    await LoanModel.create({
      userId: id,
      bookId: new Types.ObjectId().toString(),
      bookTitle: 'Clean Code',
      dueAt: new Date(),
      status: 'returned',
      returnedAt: new Date(),
    });

    await api.delete(`/api/users/${id}`).expect(204);
  });
});
