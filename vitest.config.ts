import { defineConfig } from 'vitest/config';

// Runs every service's tests together: `npm test` from the repo root.
export default defineConfig({
  test: {
    projects: ['services/*/vitest.*.config.ts', 'frontend/vitest.config.ts'],
    coverage: {
      provider: 'v8',
      include: ['services/*/src/**/*.ts', 'frontend/src/**/*.{ts,tsx}'],
      exclude: [
        'services/*/src/server.ts',
        'frontend/src/main.tsx',
        'frontend/src/api/generated/**',
      ],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
