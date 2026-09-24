import type { RequestHandler } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth.schemas.ts';
import * as authService from '../services/auth.service.ts';
import * as userService from '../services/user.service.ts';

export const register: RequestHandler = async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).location(`/api/users/${result.user.id}`).json(result);
};

export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  res.json(await authService.login(input));
};

export const me: RequestHandler = async (req, res) => {
  res.json(await userService.getUser(req.auth!.id));
};
