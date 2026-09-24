import { describe, expect, it } from 'vitest';
import { createUserSchema, updateUserSchema } from '../../src/schemas/user.schemas.ts';

describe('createUserSchema', () => {
  it('trims the name and lowercases the email', () => {
    const result = createUserSchema.parse({ name: '  Ada Lovelace ', email: ' Ada@Example.COM ' });
    expect(result).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com' });
  });

  it.each(['not-an-email', 'ada@', '@example.com', ''])('rejects the email "%s"', (email) => {
    expect(createUserSchema.safeParse({ name: 'Ada', email }).success).toBe(false);
  });

  it('rejects a blank name', () => {
    const result = createUserSchema.safeParse({ name: '  ', email: 'ada@example.com' });
    expect(result.error?.issues[0]?.message).toBe('Name is required');
  });

  it('does not let clients choose their own membership ID', () => {
    const result = createUserSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      membershipId: 'MBR001',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
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
});
