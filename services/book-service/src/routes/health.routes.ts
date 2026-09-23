import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'book-service',
    uptime: Math.round(process.uptime()),
  });
});
