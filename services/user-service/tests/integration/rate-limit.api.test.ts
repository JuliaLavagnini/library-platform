import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';

// The login rate limit counts attempts per client IP. Behind the API gateway every
// request arrives from the gateway, so the real client IP must come from X-Forwarded-For,
// but only when a trusted proxy set it. These tests check both sides of that.

const attempt = { email: 'nobody@example.com', password: 'wrong password' };

function login(app: ReturnType<typeof createApp>, forwardedFor?: string) {
  const req = request(app).post('/api/auth/login').send(attempt);
  return forwardedFor ? req.set('X-Forwarded-For', forwardedFor) : req;
}

describe('behind the gateway (one trusted proxy)', () => {
  it('limits each client separately', async () => {
    const app = createApp({ trustProxy: 1, authRateLimitPerMinute: 3 });

    for (let i = 0; i < 3; i++) {
      await login(app, '203.0.113.1').expect(401);
    }
    await login(app, '203.0.113.1').expect(429);

    // Another client is unaffected. Without trusting the proxy, everyone would share
    // the gateway's IP and one attacker would lock every user out.
    await login(app, '203.0.113.2').expect(401);
  });
});

describe('without a proxy in front', () => {
  it('ignores X-Forwarded-For, so a fake header cannot dodge the limit', async () => {
    const app = createApp({ trustProxy: 0, authRateLimitPerMinute: 3 });

    for (let i = 1; i <= 3; i++) {
      await login(app, `198.51.100.${i}`).expect(401);
    }
    const res = await login(app, '198.51.100.99').expect(429);

    expect(res.body.error.message).toBe('Too many attempts. Try again in a minute.');
    expect(res.headers['retry-after']).toBeDefined();
  });
});
