import { defineConfig } from 'vitest/config';

// Runs every service's tests together: `npm test` from the repo root.
export default defineConfig({
  test: {
    projects: ['services/*/vitest.*.config.ts'],
    coverage: {
      provider: 'v8',
      include: ['services/*/src/**/*.ts'],
      exclude: ['services/*/src/server.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
