import type { RequestHandler } from 'express';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '../schemas/user.schemas.ts';
import * as userService from '../services/user.service.ts';

type IdParams = { id: string };

export const listUsers: RequestHandler = async (req, res) => {
  const { search } = listUsersQuerySchema.parse(req.query);
  res.json(await userService.listUsers({ search }));
};

export const getUser: RequestHandler<IdParams> = async (req, res) => {
  res.json(await userService.getUser(req.params.id));
};

export const createUser: RequestHandler = async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const user = await userService.createUser(input);
  res.status(201).location(`${req.baseUrl}/${user.id}`).json(user);
};

export const updateUser: RequestHandler<IdParams> = async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  res.json(await userService.updateUser(req.params.id, input));
};

export const deleteUser: RequestHandler<IdParams> = async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.status(204).end();
};
