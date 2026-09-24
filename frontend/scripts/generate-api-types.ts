// Generates TypeScript types for the frontend from the services' OpenAPI documents.
// The documents are built from the same Zod schemas that validate requests, so if a
// backend field changes, re-running this makes the frontend fail to compile until it's
// updated, instead of breaking at runtime.
//
//   npm run api:generate -w @library/web

import { writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';

// Load the services' modules quietly (no startup warnings, no logs).
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const services = [
  { name: 'books', module: '../../services/book-service/src/docs/openapi.ts' },
  { name: 'users', module: '../../services/user-service/src/docs/openapi.ts' },
];

for (const { name, module } of services) {
  const { openApiDocument } = await import(module);
  const ast = await openapiTS(openApiDocument);
  const header = `// Generated from the ${name} service's OpenAPI document by scripts/generate-api-types.ts.\n// Do not edit by hand: run \`npm run api:generate -w @library/web\`.\n\n`;
  const target = new URL(`../src/api/generated/${name}.ts`, import.meta.url);
  await writeFile(target, header + astToString(ast));
  console.log(`wrote src/api/generated/${name}.ts`);
}
