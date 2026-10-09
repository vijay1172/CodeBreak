import { Router } from 'express';
import { auth, premiumGuard } from '../middleware/auth.js';
export function premiumRouter() {
  const router = Router();
  router.get('/features', auth, premiumGuard, (_req, res) => {
    res.json({ features: ['Priority support', 'Advanced analytics'] });
  });
  return router;
}