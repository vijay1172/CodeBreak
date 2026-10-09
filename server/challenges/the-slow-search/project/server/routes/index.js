import { Router } from 'express';
import { productsRouter } from './products.js';
import { repositories } from '../repositories/index.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/products', productsRouter(models));
  return router;
}