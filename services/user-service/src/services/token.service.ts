import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.ts';
import { JWT_ALGORITHM, keyId, privateKey, publicKey } from '../config/keys.ts';

export const USER_ROLES = ['member', 'librarian'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// "service" is used by user-service itself when it calls book-service.
export type Role = UserRole | 'service';

export interface AuthenticatedPrincipal {
  id: string;
  role: Role;
}

function newToken(subject: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: JWT_ALGORITHM, kid: keyId, typ: 'JWT' })
    .setSubject(subject)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt();
}

export async function signAccessToken(user: { id: string; role: UserRole }) {
  const expiresIn = env.ACCESS_TOKEN_TTL_MINUTES * 60;
  const accessToken = await newToken(user.id, user.role)
    .setExpirationTime(`${expiresIn}s`)
    .sign(privateKey);
  return { accessToken, tokenType: 'Bearer' as const, expiresIn };
}

// Throws if the token is malformed, expired, or wasn't issued by this service.
export async function verifyAccessToken(token: string): Promise<AuthenticatedPrincipal> {
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: [JWT_ALGORITHM],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  const role = payload.role;
  if (!payload.sub || (role !== 'member' && role !== 'librarian' && role !== 'service')) {
    throw new Error('Token is missing a subject or a valid role');
  }
  return { id: payload.sub, role };
}

// A short-lived token identifying user-service itself, cached until it's about to expire.
const SERVICE_TOKEN_TTL_SECONDS = 5 * 60;
let serviceToken: { value: string; expiresAt: number } | undefined;

export async function getServiceToken() {
  if (!serviceToken || serviceToken.expiresAt - Date.now() < 60_000) {
    const value = await newToken('user-service', 'service')
      .setExpirationTime(`${SERVICE_TOKEN_TTL_SECONDS}s`)
      .sign(privateKey);
    serviceToken = { value, expiresAt: Date.now() + SERVICE_TOKEN_TTL_SECONDS * 1000 };
  }
  return serviceToken.value;
}
