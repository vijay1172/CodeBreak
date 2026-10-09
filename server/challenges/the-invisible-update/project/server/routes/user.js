import { Router } from 'express';
import { userController } from '../controllers/userController.js';
export function userRouter(User) {
  const controller = userController(User);
  const router = Router();
  router.get('/profile', controller.profile);
  router.put('/profile', controller.update);
  return router;
}