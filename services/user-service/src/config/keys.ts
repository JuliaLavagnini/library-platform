import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { env } from './env.ts';
import { logger } from './logger.ts';

// Tokens are signed with an Ed25519 private key that only this service holds. Other
// services verify them with the matching public key, published at /.well-known/jwks.json,
// so they can check a token is genuine but can never create one.

export const JWT_ALGORITHM = 'EdDSA';

function loadPrivateKey(): KeyObject {
  if (env.JWT_PRIVATE_KEY) {
    return createPrivateKey(env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'));
  }
  if (env.NODE_ENV !== 'test') {
    logger.warn(
      'JWT_PRIVATE_KEY is not set: using a temporary key. Tokens stop working when the service restarts.',
    );
  }
  return generateKeyPairSync('ed25519').privateKey;
}

export const privateKey = loadPrivateKey();
export const publicKey = createPublicKey(privateKey);

const publicJwk = publicKey.export({ format: 'jwk' });

// Key ID = the key's RFC 7638 thumbprint, so verifiers can tell keys apart after a rotation.
const keyId = createHash('sha256')
  .update(JSON.stringify({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x }))
  .digest('base64url');

export { keyId };

export const jwks = {
  keys: [{ ...publicJwk, kid: keyId, alg: JWT_ALGORITHM, use: 'sig' }],
};
