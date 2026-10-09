import { Router } from 'express';
import { userController } from '../controllers/userController.js';
export function usersRouter(User) {
  const controller = userController(User);
  const router = Router();
  router.get('/:id', controller.profile);
  return router;
}