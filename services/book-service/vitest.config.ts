import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'book-service',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
  },
});
