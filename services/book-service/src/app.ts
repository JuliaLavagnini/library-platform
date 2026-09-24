import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { requestId } from './middlewares/request-id.ts';
import type { JWTVerifyGetKey } from 'jose';
import { createAuth, remoteKeySet } from './middlewares/auth.ts';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.ts';
import { createBookRouter } from './routes/book.routes.ts';
import { docsRouter } from './routes/docs.routes.ts';
import { healthRouter } from './routes/health.routes.ts';

export interface AppOptions {
  // Where public keys for verifying tokens come from. Defaults to user-service's JWKS
  // endpoint; tests pass their own keys.
  keySet?: JWTVerifyGetKey;
}

export function createApp({ keySet = remoteKeySet() }: AppOptions = {}) {
  const app = express();
  const auth = createAuth(keySet);

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
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
  app.use('/api/books', createBookRouter(auth));
  app.use(docsRouter);

  // Must be registered last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
