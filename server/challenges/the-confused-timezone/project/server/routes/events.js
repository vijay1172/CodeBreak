import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';
export function eventRouter(Event) {
  const controller = eventController(Event);
  const router = Router();
  router.get('/', controller.list);
  router.get('/:slug', controller.show);
  router.post('/', controller.create);
  return router;
}