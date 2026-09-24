import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'user-service:unit',
    include: ['tests/unit/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
  },
});
