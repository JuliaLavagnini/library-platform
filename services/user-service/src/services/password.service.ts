import { hash, verify } from '@node-rs/argon2';

// Argon2id with the library's defaults (OWASP's recommended algorithm for passwords).
// The hash includes its own salt and settings, so only the hash is stored.

export function hashPassword(password: string) {
  return hash(password);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}

// Used when a login email doesn't exist: verifying against a real hash anyway makes the
// response take the same time, so attackers can't discover which emails are registered.
const dummyHash = hash('not-a-real-password-used-for-timing-only');

export async function verifyAgainstDummy(password: string) {
  await verify(await dummyHash, password);
  return false;
}
