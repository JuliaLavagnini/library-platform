import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { requestId } from './middlewares/request-id.ts';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.ts';
import { createAuthRouter, jwksRouter } from './routes/auth.routes.ts';
import { docsRouter } from './routes/docs.routes.ts';
import { healthRouter } from './routes/health.routes.ts';
import { loanRouter } from './routes/loan.routes.ts';
import { userRouter } from './routes/user.routes.ts';

export interface AppOptions {
  // Proxies in front of this service; decides which IP the login rate limit counts.
  trustProxy?: number;
  authRateLimitPerMinute?: number;
}

export function createApp({
  trustProxy = env.TRUST_PROXY,
  authRateLimitPerMinute = env.AUTH_RATE_LIMIT_PER_MINUTE,
}: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(
    helmet({
      // The service speaks plain HTTP inside Docker/Kubernetes (TLS ends at the gateway),
      // so browsers must not be told to upgrade the docs page's assets to HTTPS.
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      genReqId: requestId,
      // Health checks run every few seconds; logging them would bury real traffic.
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  );

  app.use('/health', healthRouter);
  app.use('/api/auth', createAuthRouter(authRateLimitPerMinute));
  app.use(jwksRouter);
  app.use('/api/users', userRouter);
  app.use('/api/loans', loanRouter);
  app.use(docsRouter);

  // Must be registered last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
