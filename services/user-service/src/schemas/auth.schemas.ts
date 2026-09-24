import { z } from 'zod';
import { emailSchema, passwordSchema } from './user.schemas.ts';

// Self sign-up always creates a member; only librarians can create librarians.
export const registerSchema = z
  .strictObject({
    name: z.string().trim().min(1, 'Name is required').max(200).meta({ example: 'Ada Lovelace' }),
    email: emailSchema,
    password: passwordSchema,
  })
  .meta({ id: 'Register' });

export const loginSchema = z
  .strictObject({
    email: emailSchema,
    // No length rules here: the only answer to a wrong password is "invalid credentials".
    password: z.string().min(1, 'Password is required').max(128),
  })
  .meta({ id: 'Login' });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
