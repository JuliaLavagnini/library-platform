import { isValidObjectId } from 'mongoose';
import { LoanModel } from '../models/loan.model.ts';
import { UserModel } from '../models/user.model.ts';
import { ConflictError, NotFoundError } from '../errors/http-errors.ts';
import type { CreateUserInput, UpdateUserInput } from '../schemas/user.schemas.ts';
import { hashPassword } from './password.service.ts';

export interface ListUsersFilter {
  search?: string;
}

// User input goes into a regular expression, so special characters must be escaped.
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listUsers({ search }: ListUsersFilter = {}) {
  const query: Record<string, unknown> = {};

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: pattern }, { email: pattern }, { membershipId: pattern }];
  }

  return UserModel.find(query).sort({ name: 1 });
}

export async function getUser(id: string) {
  const user = isValidObjectId(id) ? await UserModel.findById(id) : null;
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }
  return user;
}

export async function createUser({ password, ...input }: CreateUserInput) {
  return UserModel.create({ ...input, passwordHash: await hashPassword(password) });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await getUser(id);

  if (input.name !== undefined) user.name = input.name;
  if (input.email !== undefined) user.email = input.email;

  return user.save();
}

export async function deleteUser(id: string) {
  const user = await getUser(id);
  // Loan history is kept for records and analytics; only active loans block deletion.
  if (await LoanModel.exists({ userId: user._id, status: 'active' })) {
    throw new ConflictError(`Cannot delete user ${id}: they still have books on loan`);
  }
  await user.deleteOne();
}
