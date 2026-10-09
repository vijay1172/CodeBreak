import { Router } from 'express';
import { categoryRouter } from './categories.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/shops', categoryRouter(models.Category, models.Shop));
  return router;
}