import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.ts';
import { bookRouter } from './routes/book.routes.ts';
import { healthRouter } from './routes/health.routes.ts';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use('/health', healthRouter);
  app.use('/api/books', bookRouter);

  // Must be registered last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
