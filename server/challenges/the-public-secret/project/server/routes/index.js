import { Router } from 'express';
import { paymentsRouter } from './payments.js';
export function domainRouter() {
  const router = Router();
  router.use('/payments', paymentsRouter());
  return router;
}