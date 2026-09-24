import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';

const app = createApp();

describe('request IDs', () => {
  it("keeps the gateway's ID so a request can be traced across services", async () => {
    const res = await request(app).get('/health').set('X-Request-ID', 'abc-123').expect(200);
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('creates an ID when none is sent', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    ['newlines (log injection)', 'abc\ninjected'],
    ['spaces and symbols', 'abc <script>'],
    ['an oversized value', 'a'.repeat(101)],
  ])('replaces an ID containing %s', async (_label, id) => {
    const res = await request(app).get('/health').set('X-Request-ID', id.replace('\n', '%0A'));
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
