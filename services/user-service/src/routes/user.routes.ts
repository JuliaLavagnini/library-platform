import { Router } from 'express';
import * as userController from '../controllers/user.controller.ts';

export const userRouter = Router();

userRouter.get('/', userController.listUsers);
userRouter.post('/', userController.createUser);
userRouter.get('/:id', userController.getUser);
userRouter.patch('/:id', userController.updateUser);
userRouter.delete('/:id', userController.deleteUser);
