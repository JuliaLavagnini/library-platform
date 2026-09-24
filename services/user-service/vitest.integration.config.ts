import { defineProject } from 'vitest/config';

// API tests against a real MongoDB, started once per run in a throwaway container.
export default defineProject({
  test: {
    name: 'user-service:integration',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/support/global-setup.ts'],
    setupFiles: ['tests/integration/support/database.ts'],
    // The first run downloads the MongoDB image.
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      AUTH_RATE_LIMIT_PER_MINUTE: '1000',
    },
  },
});
