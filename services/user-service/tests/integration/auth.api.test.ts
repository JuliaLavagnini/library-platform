import { SignJWT } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { keyId, privateKey } from '../../src/config/keys.ts';
import { UserModel } from '../../src/models/user.model.ts';
import { ensureBootstrapLibrarian } from '../../src/services/auth.service.ts';
import { verifyAccessToken } from '../../src/services/token.service.ts';

const app = createApp();
const password = 'correct horse battery staple';

async function register(email = 'ada@example.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Ada Lovelace', email, password })
    .expect(201);
  return res.body as { user: { id: string }; accessToken: string };
}

describe('POST /api/auth/register', () => {
  it('creates a member account and logs it in', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'Ada@Example.com', password })
      .expect(201);

    expect(res.body.user).toMatchObject({ email: 'ada@example.com', role: 'member' });
    expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    await expect(verifyAccessToken(res.body.accessToken)).resolves.toEqual({
      id: res.body.user.id,
      role: 'member',
    });
  });

  it('stores an Argon2id hash, never the password, and never returns it', async () => {
    const { user } = await register();

    const stored = await UserModel.findById(user.id).select('+passwordHash').lean();

    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(password);
    expect(JSON.stringify(user)).not.toContain('argon2');
  });

  it('rejects an email that already has an account', async () => {
    await register();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Someone', email: 'ada@example.com', password })
      .expect(409);
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'short' })
      .expect(400);
    expect(res.body.error.details[0].message).toBe('Password must be at least 12 characters');
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for the right password, whatever the email case', async () => {
    const { user } = await register();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADA@example.com', password })
      .expect(200);

    expect(res.body.user.id).toBe(user.id);
    await expect(verifyAccessToken(res.body.accessToken)).resolves.toMatchObject({ id: user.id });
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    await register();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'not the right password' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password })
      .expect(401);

    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.message).toBe('Invalid email or password');
    expect(wrongPassword.headers['www-authenticate']).toBe('Bearer');
  });

  it('cannot log in to an account that has no password', async () => {
    await UserModel.create({ name: 'Legacy', email: 'legacy@example.com' });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'legacy@example.com', password })
      .expect(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the logged-in account', async () => {
    const { user, accessToken } = await register();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ id: user.id, email: 'ada@example.com' });
  });

  it.each([
    ['no Authorization header', undefined, 'Missing bearer token'],
    ['a non-Bearer scheme', 'Basic YWRhOnBhc3N3b3Jk', 'Missing bearer token'],
    ['a garbage token', 'Bearer not.a.token', 'Invalid or expired token'],
  ])('rejects %s with 401', async (_label, header, message) => {
    const req = request(app).get('/api/auth/me');
    if (header) req.set('Authorization', header);

    const res = await req.expect(401);

    expect(res.body.error.message).toBe(message);
  });

  it('rejects an expired token', async () => {
    const { user } = await register();
    const expired = await new SignJWT({ role: 'member' })
      .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
      .setSubject(user.id)
      .setIssuer('library-platform/user-service')
      .setAudience('library-platform')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(privateKey);

    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
  });
});

describe('GET /.well-known/jwks.json', () => {
  it('publishes the public key for other services', async () => {
    const res = await request(app).get('/.well-known/jwks.json').expect(200);

    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', alg: 'EdDSA' });
    expect(res.body.keys[0]).not.toHaveProperty('d');
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });
});

describe('bootstrap librarian', () => {
  it('creates the first librarian, who can then log in', async () => {
    await ensureBootstrapLibrarian('head@library.test', password);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'head@library.test', password })
      .expect(200);

    expect(res.body.user.role).toBe('librarian');
  });

  it('does nothing once a librarian exists', async () => {
    await ensureBootstrapLibrarian('head@library.test', password);
    await ensureBootstrapLibrarian('second@library.test', password);

    expect(await UserModel.countDocuments({ role: 'librarian' })).toBe(1);
  });

  it('never promotes an existing member account', async () => {
    await register('head@library.test');

    await ensureBootstrapLibrarian('head@library.test', password);

    expect(await UserModel.countDocuments({ role: 'librarian' })).toBe(0);
  });

  it('does nothing when not configured', async () => {
    await ensureBootstrapLibrarian(undefined, undefined);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  // Several replicas start together in Kubernetes and all run this at once.
  it('creates exactly one librarian when several instances start at once', async () => {
    await expect(
      Promise.all(
        Array.from({ length: 5 }, () => ensureBootstrapLibrarian('head@library.test', password)),
      ),
    ).resolves.toBeDefined();

    expect(await UserModel.countDocuments({ role: 'librarian' })).toBe(1);
  });
});
