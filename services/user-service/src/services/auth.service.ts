import { logger } from '../config/logger.ts';
import { UnauthorizedError } from '../errors/http-errors.ts';
import { UserModel } from '../models/user.model.ts';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas.ts';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password.service.ts';
import { signAccessToken } from './token.service.ts';

export async function register(input: RegisterInput) {
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    role: 'member',
    passwordHash: await hashPassword(input.password),
  });
  return { user, ...(await signAccessToken({ id: user.id, role: user.role })) };
}

export async function login({ email, password }: LoginInput) {
  const user = await UserModel.findOne({ email }).select('+passwordHash');

  const valid = user?.passwordHash
    ? await verifyPassword(user.passwordHash, password)
    : await verifyAgainstDummy(password);

  // Same message whether the email or the password was wrong, so it doesn't reveal
  // which emails have accounts.
  if (!user || !valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return { user, ...(await signAccessToken({ id: user.id, role: user.role })) };
}

// Creates the first librarian from environment variables, so a fresh install has someone
// who can manage the library. Does nothing once any librarian exists.
export async function ensureBootstrapLibrarian(email?: string, password?: string) {
  if (!email || !password) return;
  if (await UserModel.exists({ role: 'librarian' })) return;

  if (await UserModel.exists({ email })) {
    logger.warn(
      { email },
      'bootstrap librarian not created: a non-librarian account already uses this email',
    );
    return;
  }

  await UserModel.create({
    name: 'Librarian',
    email,
    role: 'librarian',
    passwordHash: await hashPassword(password),
  });
  logger.info({ email }, 'created bootstrap librarian account');
}
