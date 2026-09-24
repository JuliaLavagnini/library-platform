import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'user-service:unit',
    include: ['tests/unit/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      AUTH_RATE_LIMIT_PER_MINUTE: '1000',
    },
  },
});
