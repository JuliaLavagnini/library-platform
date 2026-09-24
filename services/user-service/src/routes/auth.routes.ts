import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.ts';
import * as authController from '../controllers/auth.controller.ts';
import { authenticate } from '../middlewares/auth.ts';
import { jwks } from '../config/keys.ts';

export const authRouter = Router();

// Slows down password guessing: each IP gets a limited number of attempts per minute.
const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: env.AUTH_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { message: 'Too many attempts. Try again in a minute.' } });
  },
});

authRouter.post('/register', authRateLimit, authController.register);
authRouter.post('/login', authRateLimit, authController.login);
authRouter.get('/me', authenticate, authController.me);

// Public keys other services use to verify tokens (JSON Web Key Set).
export const jwksRouter = Router();

jwksRouter.get('/.well-known/jwks.json', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json(jwks);
});
