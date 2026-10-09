import { Router } from 'express';
import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { productRepository } from '../repositories/productRepository.js';
export function productsRouter(models) {
  const controller = productController(productRepository(models));
  const router = Router();
  router.get('/search', controller.search);
  return router;
}