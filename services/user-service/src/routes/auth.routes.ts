import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.ts';
import { authenticate } from '../middlewares/auth.ts';
import { jwks } from '../config/keys.ts';

export function createAuthRouter(rateLimitPerMinute: number) {
  const router = Router();

  // Slows down password guessing: each client IP gets a limited number of attempts per
  // minute. Behind the gateway, the IP comes from X-Forwarded-For (see TRUST_PROXY).
  const authRateLimit = rateLimit({
    windowMs: 60_000,
    limit: rateLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { message: 'Too many attempts. Try again in a minute.' } });
    },
  });

  router.post('/register', authRateLimit, authController.register);
  router.post('/login', authRateLimit, authController.login);
  router.get('/me', authenticate, authController.me);

  return router;
}

// Public keys other services use to verify tokens (JSON Web Key Set).
export const jwksRouter = Router();

jwksRouter.get('/.well-known/jwks.json', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json(jwks);
});
