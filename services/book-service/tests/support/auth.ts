import { generateKeyPairSync } from 'node:crypto';
import { createLocalJWKSet, SignJWT } from 'jose';
import type { Role } from '../../src/middlewares/auth.ts';

// Stands in for user-service in tests: a key pair whose public half is handed to the app
// (instead of fetching user-service's JWKS) and whose private half signs test tokens.

const { privateKey, publicKey } = generateKeyPairSync('ed25519');

export const testKeySet = createLocalJWKSet({
  keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'EdDSA' }],
});

interface TokenOptions {
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  key?: typeof privateKey;
}

export async function signTestToken(role: Role | string, options: TokenOptions = {}) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'test-key' })
    .setSubject(role === 'service' ? 'user-service' : '6ab476e7c288167098513c7b')
    .setIssuer(options.issuer ?? 'library-platform/user-service')
    .setAudience(options.audience ?? 'library-platform')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '5m')
    .sign(options.key ?? privateKey);
}

export async function bearer(role: Role) {
  return `Bearer ${await signTestToken(role)}`;
}
