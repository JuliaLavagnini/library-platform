import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'user-service',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
  },
});
