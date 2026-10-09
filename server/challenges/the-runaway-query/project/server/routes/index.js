import { Router } from 'express';
import { adminRouter } from './admin.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/admin', adminRouter(models.User));
  return router;
}