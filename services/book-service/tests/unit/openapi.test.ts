import type { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { openApiDocument } from '../../src/docs/openapi.ts';
import { createAuth } from '../../src/middlewares/auth.ts';
import { createBookRouter } from '../../src/routes/book.routes.ts';
import { testKeySet } from '../support/auth.ts';
import { healthRouter } from '../../src/routes/health.routes.ts';

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

// Lists "METHOD /path" for every route registered on a router, in OpenAPI path style.
function operationsOf(router: Router, prefix: string) {
  return (router.stack as RouteLayer[]).flatMap(({ route }) =>
    route
      ? Object.keys(route.methods).map((method) => {
          const path = `${prefix}${route.path === '/' ? '' : route.path}`;
          return `${method.toUpperCase()} ${path.replace(/:(\w+)/g, '{$1}')}`;
        })
      : [],
  );
}

function documentedOperations() {
  return Object.entries(openApiDocument.paths ?? {}).flatMap(([path, item]) =>
    Object.keys(item ?? {}).map((method) => `${method.toUpperCase()} ${path}`),
  );
}

describe('OpenAPI document', () => {
  it('documents exactly the routes the app serves', () => {
    const served = [
      ...operationsOf(createBookRouter(createAuth(testKeySet)), '/api/books'),
      ...operationsOf(healthRouter, '/health'),
    ];

    expect(documentedOperations().sort()).toEqual(served.sort());
  });

  it('is served as JSON', async () => {
    const res = await request(createApp()).get('/openapi.json').expect(200);

    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.info.title).toBe('Book Service');
  });

  it('serves the interactive docs page', async () => {
    const res = await request(createApp()).get('/docs/').expect(200);

    expect(res.text).toContain('<title>Book Service API</title>');
  });
});
