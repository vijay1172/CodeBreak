import { Router } from 'express';
import { usersRouter } from './users.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/users', usersRouter(models.User));
  return router;
}