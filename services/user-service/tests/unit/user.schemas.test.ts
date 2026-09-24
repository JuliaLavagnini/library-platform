import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../../src/schemas/auth.schemas.ts';
import { createUserSchema, updateUserSchema } from '../../src/schemas/user.schemas.ts';

const password = 'correct horse battery staple';

describe('createUserSchema', () => {
  it('trims the name, lowercases the email and defaults the role to member', () => {
    const result = createUserSchema.parse({
      name: '  Ada Lovelace ',
      email: ' Ada@Example.COM ',
      password,
    });
    expect(result).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password,
      role: 'member',
    });
  });

  it.each(['not-an-email', 'ada@', '@example.com', ''])('rejects the email "%s"', (email) => {
    expect(createUserSchema.safeParse({ name: 'Ada', email, password }).success).toBe(false);
  });

  it('rejects a blank name', () => {
    const result = createUserSchema.safeParse({ name: '  ', email: 'ada@example.com', password });
    expect(result.error?.issues[0]?.message).toBe('Name is required');
  });

  it('accepts the librarian role', () => {
    const result = createUserSchema.parse({
      name: 'Ada',
      email: 'ada@example.com',
      password,
      role: 'librarian',
    });
    expect(result.role).toBe('librarian');
  });

  it('rejects an unknown role', () => {
    const input = { name: 'Ada', email: 'ada@example.com', password, role: 'admin' };
    expect(createUserSchema.safeParse(input).success).toBe(false);
  });

  it('does not let clients choose their own membership ID', () => {
    const result = createUserSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password,
      membershipId: 'MBR001',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
  });
});

describe('password rules', () => {
  it.each([
    ['11 characters', 'a'.repeat(11), 'Password must be at least 12 characters'],
    ['129 characters', 'a'.repeat(129), 'Password must be at most 128 characters'],
  ])('rejects a password of %s', (_label, candidate, message) => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: candidate,
    });
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it('accepts a long passphrase with spaces', () => {
    expect(
      registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password }).success,
    ).toBe(true);
  });
});

describe('registerSchema', () => {
  it('does not let people sign themselves up as librarians', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password,
      role: 'librarian',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
  });
});

describe('loginSchema', () => {
  it('normalises the email so login is case-insensitive', () => {
    expect(loginSchema.parse({ email: ' ADA@example.com', password: 'x' }).email).toBe(
      'ada@example.com',
    );
  });

  it('requires a password', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts a single field', () => {
    expect(updateUserSchema.parse({ email: 'NEW@example.com' })).toEqual({
      email: 'new@example.com',
    });
  });

  it('rejects an empty update', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it.each([
    ['role', { role: 'librarian' }],
    ['password', { password }],
  ])('does not allow changing %s through a profile update', (_label, input) => {
    expect(updateUserSchema.safeParse(input).success).toBe(false);
  });
});
