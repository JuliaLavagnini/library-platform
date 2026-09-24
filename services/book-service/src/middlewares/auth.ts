import type { RequestHandler } from 'express';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import {
  ForbiddenError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../errors/http-errors.ts';

// Tokens are issued by user-service. This service can check a token is genuine using
// user-service's public keys, but holds no private key, so it can never create one.

export type Role = 'member' | 'librarian' | 'service';

export interface AuthenticatedPrincipal {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    // Set by `authenticate` once the bearer token has been verified.
    auth?: AuthenticatedPrincipal;
  }
}

// Fetches user-service's public keys on first use, caches them, and refetches when a
// token names a key it hasn't seen (e.g. after a key rotation).
export function remoteKeySet(): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(env.JWKS_URL));
}

function isRole(value: unknown): value is Role {
  return value === 'member' || value === 'librarian' || value === 'service';
}

export function createAuth(keySet: JWTVerifyGetKey) {
  const authenticate: RequestHandler = async (req, _res, next) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Missing bearer token');
    }

    try {
      const { payload } = await jwtVerify(token, keySet, {
        algorithms: ['EdDSA'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });
      if (!payload.sub || !isRole(payload.role)) {
        throw new UnauthorizedError('Invalid or expired token');
      }
      req.auth = { id: payload.sub, role: payload.role };
    } catch (err) {
      // A bad token is the client's problem (401). Failing to fetch the public keys is
      // ours (503): the token might be perfectly valid.
      if (err instanceof UnauthorizedError) throw err;
      if (err instanceof errors.JOSEError && !(err instanceof errors.JWKSTimeout)) {
        throw new UnauthorizedError('Invalid or expired token');
      }
      logger.error({ err }, 'could not fetch signing keys from user-service');
      throw new ServiceUnavailableError('Cannot verify tokens right now, please try again later');
    }
    next();
  };

  function requireRole(...roles: Role[]): RequestHandler {
    return (req, _res, next) => {
      if (!req.auth || !roles.includes(req.auth.role)) {
        throw new ForbiddenError();
      }
      next();
    };
  }

  return { authenticate, requireRole };
}

export type Auth = ReturnType<typeof createAuth>;
