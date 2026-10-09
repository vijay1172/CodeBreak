import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
export function categoryRouter(Category, Shop) {
  const controller = categoryController(Category, Shop);
  const router = Router();
  router.get('/', controller.list);
  router.get('/:shopId/categories', controller.forShop);
  return router;
}