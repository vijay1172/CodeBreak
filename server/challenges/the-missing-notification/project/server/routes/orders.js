import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';
export function orderRouter(Order, services) {
  const controller = orderController(Order, services);
  const router = Router();
  router.post('/', controller.place);
  return router;
}