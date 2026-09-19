import { Router } from 'express';
import { assignmentRepository } from '../repositories/assignments.js';
import { assignmentController } from '../controllers/assignments.js';
export function domainRouter(models) {
  const router = Router();
  const controller = assignmentController(assignmentRepository(models));
  router.get('/assignments', controller.list);
  router.get('/assignments/:slug', controller.get);
  router.post('/assignments', controller.save);
  return router;
}
