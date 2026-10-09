import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
export function orderRouter(Order, Product) {
  const controller = orderController(Order, Product);
  const router = Router();
  router.post('/', controller.create);
  return router;
}