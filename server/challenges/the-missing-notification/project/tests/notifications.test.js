import { beforeAll, beforeEach, it, expect, vi } from 'vitest';
import request from 'supertest';
import { workspace } from './helpers.js';
import { createApp } from '../server/app.js';
import { createEmailService } from '../server/services/emailService.js';
import { createInventoryService } from '../server/services/inventoryService.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
const appWith = (overrides) => request(createApp(w.models, overrides));
it('confirms the order and completes both side effects', async () => {
  const email = createEmailService();
  const emailSpy = vi.spyOn(email, 'sendConfirmation');
  const response = await appWith({ email }).post('/api/orders').send({ sku: 'lamp', quantity: 2 });
  expect(response.status).toBe(201);
  expect(emailSpy).toHaveBeenCalled();
});
it('fails the request when the inventory update throws', async () => {
  const inventory = createInventoryService(w.models.Product);
  vi.spyOn(inventory, 'adjustInventory').mockRejectedValue(new Error('stock service down'));
  const response = await appWith({ inventory }).post('/api/orders').send({ sku: 'lamp', quantity: 1 });
  expect(response.status).toBe(500);
});
it('does not confirm the order when the notification fails', async () => {
  const email = createEmailService();
  vi.spyOn(email, 'sendConfirmation').mockRejectedValue(new Error('smtp offline'));
  const response = await appWith({ email }).post('/api/orders').send({ sku: 'lamp', quantity: 1 });
  expect(response.status).toBe(500);
});
it('decrements stock by the ordered quantity', async () => {
  await appWith({}).post('/api/orders').send({ sku: 'lamp', quantity: 2 });
  const product = await w.models.Product.findOne({ sku: 'lamp' }).lean();
  expect(product.stock).toBe(10);
});
it('leaves stock untouched when the inventory update fails', async () => {
  await appWith({}).post('/api/orders').send({ sku: 'lamp', quantity: 99 });
  const product = await w.models.Product.findOne({ sku: 'lamp' }).lean();
  expect(product.stock).toBe(12);
});