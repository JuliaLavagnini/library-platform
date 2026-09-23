import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../errors/http-errors.ts';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found` } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }

  req.log.error({ err }, 'unhandled error');
  res.status(500).json({ error: { message: 'Internal server error' } });
};
