import { Router } from 'express';
import { TimedCache } from '../cache/TimedCache.js';
import { productRepository } from '../repositories/products.js';
import { productCatalogue } from '../services/productCatalogue.js';
import { catalogueController } from '../controllers/catalogue.js';
export function domainRouter(models) {
  const router = Router();
  const controller = catalogueController(productCatalogue(productRepository(models), new TimedCache()));
  router.get('/products', controller.list);
  router.get('/products/:sku', controller.get);
  return router;
}
