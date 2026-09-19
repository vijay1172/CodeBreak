import { Router } from 'express';
import { registrationRepository } from '../repositories/registrations.js';
import { registrationController } from '../controllers/registrations.js';
export function domainRouter(models) {
  const router = Router();
  const controller = registrationController(registrationRepository(models));
  router.get('/workshops', controller.workshops);
  router.get('/registrations', controller.list);
  router.post('/registrations', controller.create);
  return router;
}
