import { Router } from 'express';
import { contactRepository } from '../repositories/contacts.js';
import { contactController } from '../controllers/contacts.js';
import { uploadCsv } from '../middleware/upload.js';
export function domainRouter(models) {
  const router = Router();
  const controller = contactController(contactRepository(models));
  router.get('/contacts', controller.list);
  router.get('/imports', controller.batches);
  router.post('/imports', uploadCsv, controller.import);
  return router;
}
