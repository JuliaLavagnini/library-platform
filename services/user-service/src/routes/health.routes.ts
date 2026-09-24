import { Router } from 'express';
import { isDatabaseReady } from '../config/database.ts';

export const healthRouter = Router();

// Liveness: the process is up.
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'user-service',
    uptime: Math.round(process.uptime()),
  });
});

// Readiness: the service can handle traffic because its dependencies are reachable.
healthRouter.get('/ready', (_req, res) => {
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'unavailable',
    checks: { database: ready ? 'up' : 'down' },
  });
});
