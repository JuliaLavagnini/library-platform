import { Types } from 'mongoose';
import { signAccessToken, type UserRole } from '../../../src/services/token.service.ts';

// Builds an "Authorization" header value for a role. The account doesn't need to exist:
// routes only check the token, except /api/auth/me, which looks the account up.
export async function bearer(role: UserRole, id = new Types.ObjectId().toString()) {
  const { accessToken } = await signAccessToken({ id, role });
  return `Bearer ${accessToken}`;
}
