// End-to-end test of the running platform, through the API gateway:
// login, access rules, the full borrow/return flow, and the gateway's own behaviour.
//
//   npm run docker:up
//   npm run test:e2e
//
// Uses the librarian from .env (BOOTSTRAP_LIBRARIAN_EMAIL / _PASSWORD). Creates its own
// test data and deletes it afterwards. Exits with code 1 if any check fails.

const GATEWAY = process.env.GATEWAY_URL ?? 'http://localhost:8000';
const librarianEmail = process.env.BOOTSTRAP_LIBRARIAN_EMAIL;
const librarianPassword = process.env.BOOTSTRAP_LIBRARIAN_PASSWORD;

if (!librarianEmail || !librarianPassword) {
  console.error(
    'Set BOOTSTRAP_LIBRARIAN_EMAIL and BOOTSTRAP_LIBRARIAN_PASSWORD (see .env.example).',
  );
  process.exit(1);
}

interface Result {
  status: number;
  headers: Headers;
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<Result> {
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
      ...(options.token && { Authorization: `Bearer ${options.token}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (e.g. the docs page): keep the text.
  }
  return { status: res.status, headers: res.headers, body };
}

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` (expected ${expected}, got ${actual})`}`,
  );
}

// --- Gateway ---
const health = await call('GET', '/health');
check('gateway is healthy', health.status, 200);
check(
  'gateway gives every response a request ID',
  Boolean(health.headers.get('x-request-id')),
  true,
);
check('unknown paths return 404', (await call('GET', '/nothing-here')).status, 404);
check('book docs are served', (await call('GET', '/docs/books/')).status, 200);
check('user docs are served', (await call('GET', '/docs/users/')).status, 200);
check('public keys are served', (await call('GET', '/.well-known/jwks.json')).status, 200);

// --- Accounts ---
const librarianLogin = await call('POST', '/api/auth/login', {
  body: { email: librarianEmail, password: librarianPassword },
});
check('librarian logs in', librarianLogin.status, 200);
const librarian: string = librarianLogin.body.accessToken;

const signup = await call('POST', '/api/auth/register', {
  body: {
    name: 'E2E Member',
    email: `e2e-${Date.now()}@example.com`,
    password: 'correct horse battery staple',
  },
});
check('member signs up', signup.status, 201);
const member: string = signup.body.accessToken;
const memberId: string = signup.body.user.id;

// --- Books ---
const book = await call('POST', '/api/books', {
  token: librarian,
  body: { isbn: '9781617294136', title: `E2E Book ${Date.now()}`, author: 'Test', totalCopies: 1 },
});
check('librarian adds a book', book.status, 201);
const bookId: string = book.body.id;

check('anyone can browse books', (await call('GET', `/api/books/${bookId}`)).status, 200);
check(
  'member cannot add books',
  (await call('POST', '/api/books', { token: member, body: {} })).status,
  403,
);
check(
  'the gateway hides the internal borrow endpoint',
  (await call('POST', `/api/books/${bookId}/borrow`, { token: member })).status,
  404,
);

// --- Loans ---
const loan = await call('POST', `/api/users/${memberId}/loans`, {
  token: member,
  body: { bookId },
});
check('member borrows the book', loan.status, 201);
check(
  'one copy left the shelf',
  (await call('GET', `/api/books/${bookId}`)).body.availableCopies,
  0,
);
check(
  'member cannot see all loans',
  (await call('GET', '/api/loans', { token: member })).status,
  403,
);
const returned = await call('POST', `/api/users/${memberId}/loans/${loan.body.id}/return`, {
  token: member,
});
check('member returns the book', returned.status, 200);
check(
  'the copy is back on the shelf',
  (await call('GET', `/api/books/${bookId}`)).body.availableCopies,
  1,
);

// --- Clean up ---
check(
  'librarian deletes the test member',
  (await call('DELETE', `/api/users/${memberId}`, { token: librarian })).status,
  204,
);
check(
  'librarian deletes the test book',
  (await call('DELETE', `/api/books/${bookId}`, { token: librarian })).status,
  204,
);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
