import { Router } from 'express';
import { adminOnly } from '../middleware/adminOnly.js';
import { adminController } from '../controllers/adminController.js';
export function adminRouter(User) {
  const controller = adminController(User);
  const router = Router();
  router.get('/users', adminOnly, controller.directory);
  return router;
}