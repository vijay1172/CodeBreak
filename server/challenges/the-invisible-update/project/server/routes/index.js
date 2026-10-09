import { Router } from 'express';
import { userRouter } from './user.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/user', userRouter(models.User));
  return router;
}