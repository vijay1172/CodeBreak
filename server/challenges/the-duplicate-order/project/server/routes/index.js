import { Router } from 'express';
import { orderRouter } from './orders.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/orders', orderRouter(models.Order, models.Product));
  return router;
}