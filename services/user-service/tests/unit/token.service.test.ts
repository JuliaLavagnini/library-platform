import { decodeProtectedHeader, SignJWT } from 'jose';
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { jwks, keyId } from '../../src/config/keys.ts';
import {
  getServiceToken,
  signAccessToken,
  verifyAccessToken,
} from '../../src/services/token.service.ts';

const userId = '6ab476e7c288167098513c7b';

describe('access tokens', () => {
  it('round-trips the user id and role', async () => {
    const { accessToken } = await signAccessToken({ id: userId, role: 'librarian' });

    await expect(verifyAccessToken(accessToken)).resolves.toEqual({
      id: userId,
      role: 'librarian',
    });
  });

  it('expires after the configured 15 minutes', async () => {
    const { expiresIn, tokenType } = await signAccessToken({ id: userId, role: 'member' });

    expect(tokenType).toBe('Bearer');
    expect(expiresIn).toBe(15 * 60);
  });

  it('names the signing key so verifiers can find it in the JWKS', async () => {
    const { accessToken } = await signAccessToken({ id: userId, role: 'member' });

    expect(decodeProtectedHeader(accessToken)).toMatchObject({ alg: 'EdDSA', kid: keyId });
    expect(jwks.keys[0]).toMatchObject({ kid: keyId, kty: 'OKP', crv: 'Ed25519', use: 'sig' });
  });

  it('publishes only the public half of the key', () => {
    expect(jwks.keys[0]).not.toHaveProperty('d');
  });

  it('rejects a token signed with a different key', async () => {
    const attackerKey = generateKeyPairSync('ed25519').privateKey;
    const forged = await new SignJWT({ role: 'librarian' })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setSubject(userId)
      .setIssuer('library-platform/user-service')
      .setAudience('library-platform')
      .setExpirationTime('5m')
      .sign(attackerKey);

    await expect(verifyAccessToken(forged)).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const { accessToken } = await signAccessToken({ id: userId, role: 'member' });
    const [header, , signature] = accessToken.split('.');
    const escalated = Buffer.from(JSON.stringify({ sub: userId, role: 'librarian' })).toString(
      'base64url',
    );

    await expect(verifyAccessToken(`${header}.${escalated}.${signature}`)).rejects.toThrow();
  });

  it("rejects an unsigned token ('alg: none')", async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: userId, role: 'librarian' })).toString(
      'base64url',
    );

    await expect(verifyAccessToken(`${header}.${payload}.`)).rejects.toThrow();
  });
});

describe('service token', () => {
  it('identifies user-service with the service role', async () => {
    await expect(verifyAccessToken(await getServiceToken())).resolves.toEqual({
      id: 'user-service',
      role: 'service',
    });
  });

  it('is reused while still valid', async () => {
    expect(await getServiceToken()).toBe(await getServiceToken());
  });
});
