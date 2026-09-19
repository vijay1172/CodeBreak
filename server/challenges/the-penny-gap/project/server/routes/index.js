import { Router } from 'express';
import { invoiceRepository } from '../repositories/invoiceRepository.js';
import { invoiceController } from '../controllers/invoices.js';
export function domainRouter(models) {
  const router = Router();
  const controller = invoiceController(invoiceRepository(models));
  router.get('/products', controller.products);
  router.get('/invoices', controller.history);
  router.post('/invoices/preview', controller.preview);
  router.post('/invoices', controller.create);
  return router;
}
