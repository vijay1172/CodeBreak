import { Router } from 'express';
import { orderRouter } from './orders.js';
export function domainRouter(models, services) {
  const router = Router();
  router.use('/orders', orderRouter(models.Order, services));
  return router;
}