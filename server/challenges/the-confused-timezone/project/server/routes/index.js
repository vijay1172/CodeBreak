import { Router } from 'express';
import { eventRouter } from './events.js';
export function domainRouter(models) {
  const router = Router();
  router.use('/events', eventRouter(models.Event));
  return router;
}