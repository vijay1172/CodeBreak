import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
export function orderRouter(Order, Product, services) {
  const controller = orderController(Order, Product, services);
  const router = Router();
  router.get('/stock/:sku', controller.stock);
  router.post('/', controller.place);
  return router;
}