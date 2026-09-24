import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/http-errors.ts';
import {
  verifyAccessToken,
  type AuthenticatedPrincipal,
  type Role,
} from '../services/token.service.ts';

declare module 'express-serve-static-core' {
  interface Request {
    // Set by `authenticate` once the bearer token has been verified.
    auth?: AuthenticatedPrincipal;
  }
}

// Requires a valid "Authorization: Bearer <token>" header.
export const authenticate: RequestHandler = async (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Missing bearer token');
  }

  try {
    req.auth = await verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

// For routes about one member (/api/users/:id/...): that member, or any librarian.
export const requireSelfOrLibrarian: RequestHandler<{ id: string }> = (req, _res, next) => {
  const auth = req.auth;
  const allowed =
    auth?.role === 'librarian' || (auth?.role === 'member' && auth.id === req.params.id);
  if (!allowed) {
    throw new ForbiddenError();
  }
  next();
};
