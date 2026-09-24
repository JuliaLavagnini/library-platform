import { pino } from 'pino';
import { env } from './env.ts';

export const logger = pino({
  name: 'user-service',
  level: env.LOG_LEVEL,
  // Human-readable logs locally, JSON everywhere else (for log aggregation).
  ...(env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});
