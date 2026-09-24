import { z } from 'zod';

// Docker Compose passes unset variables as empty strings; treat them as missing.
const blankAsUndefined = (value: unknown) => (value === '' ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8081),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  // Number of proxies in front of this service (e.g. 1 behind the API gateway). Lets
  // Express read the real client IP from X-Forwarded-For. 0 = connected directly.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  MONGODB_URI: z.url().default('mongodb://localhost:27017/users'),
  BOOK_SERVICE_URL: z.url().default('http://localhost:8080'),
  BOOK_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  LOAN_PERIOD_DAYS: z.coerce.number().int().positive().default(14),

  // Authentication
  // Ed25519 private key (PKCS#8 PEM) used to sign tokens. "\n" escapes are allowed so the
  // key fits on one line in a .env file. If unset, a temporary key is generated at startup.
  JWT_PRIVATE_KEY: z.preprocess(blankAsUndefined, z.string().optional()),
  JWT_ISSUER: z.string().default('library-platform/user-service'),
  JWT_AUDIENCE: z.string().default('library-platform'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  // Creates the first librarian account on startup if no librarian exists yet.
  BOOTSTRAP_LIBRARIAN_EMAIL: z.preprocess(blankAsUndefined, z.email().optional()),
  BOOTSTRAP_LIBRARIAN_PASSWORD: z.preprocess(blankAsUndefined, z.string().min(12).optional()),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: a service with bad config should never start.
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env: Env = parsed.data;
