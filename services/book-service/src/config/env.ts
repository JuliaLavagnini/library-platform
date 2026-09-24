import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  // Number of proxies in front of this service (e.g. 1 behind the API gateway). Lets
  // Express read the real client IP from X-Forwarded-For. 0 = connected directly.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  MONGODB_URI: z.url().default('mongodb://localhost:27017/books'),

  // Authentication: tokens are issued by user-service; this service only verifies them
  // using the public keys user-service publishes.
  JWKS_URL: z.url().default('http://localhost:8081/.well-known/jwks.json'),
  JWT_ISSUER: z.string().default('library-platform/user-service'),
  JWT_AUDIENCE: z.string().default('library-platform'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: a service with bad config should never start.
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env: Env = parsed.data;
