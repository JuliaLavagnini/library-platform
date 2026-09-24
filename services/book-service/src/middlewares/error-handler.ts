import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http-errors.ts';

interface ErrorBody {
  error: {
    message: string;
    details?: { path: string; message: string }[];
  };
}

function errorBody(message: string, details?: ErrorBody['error']['details']): ErrorBody {
  return { error: { message, ...(details && { details }) } };
}

// MongoDB duplicate key error (a unique index was violated).
function isDuplicateKeyError(err: unknown): err is { code: 11000; keyValue?: object } {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;
}

// Errors from Express's body parser (malformed JSON, payload too large...).
function isClientRequestError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status >= 400 &&
    err.status < 500 &&
    'expose' in err &&
    err.expose === true
  );
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody(`Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json(errorBody(err.message));
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json(errorBody('Validation failed', details));
    return;
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    res.status(409).json(errorBody(`A record with this ${field} already exists`));
    return;
  }

  if (err instanceof mongoose.Error.VersionError) {
    res
      .status(409)
      .json(errorBody('The record was changed by another request. Reload it and try again.'));
    return;
  }

  if (isClientRequestError(err)) {
    const message = err.status === 400 ? 'Malformed JSON in request body' : err.message;
    res.status(err.status).json(errorBody(message));
    return;
  }

  req.log.error({ err }, 'unhandled error');
  res.status(500).json(errorBody('Internal server error'));
};
