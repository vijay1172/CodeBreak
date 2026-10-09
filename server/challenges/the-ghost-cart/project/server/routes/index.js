import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { upgradeController } from '../controllers/upgradeController.js';
import { premiumRouter } from './premium.js';
export function domainRouter(models) {
  const router = Router();
  router.post('/auth/login', authController(models.User).login);
  router.post('/upgrade', upgradeController(models.User).upgrade);
  router.use('/premium', premiumRouter());
  return router;
}