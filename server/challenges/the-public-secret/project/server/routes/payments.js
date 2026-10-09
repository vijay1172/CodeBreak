import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
export function paymentsRouter() {
  const controller = paymentController();
  const router = Router();
  router.post('/intent', controller.intent);
  return router;
}