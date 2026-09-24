import { z } from 'zod';

export const createUserSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.email('Email must be a valid email address').trim().toLowerCase(),
});

export const updateUserSchema = createUserSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
