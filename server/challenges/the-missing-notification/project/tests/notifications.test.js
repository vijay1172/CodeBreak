/*
 * Challenge: The Missing Notification
 * Bug category: Incomplete order side effects.
 * Scenarios: 5.
 * Behavioral symptom: Checkout reports success when required notification or inventory work fails.
 */
import { afterAll, beforeAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { workspace } from './helpers.js';
import { createApp } from '../server/app.js';
import { createEmailService } from '../server/services/emailService.js';
import { createInventoryService } from '../server/services/inventoryService.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
function fixture(overrides = {}) {
  const delivered = [];
  const pending = [];
  const email = overrides.email || { async sendConfirmation(order) {
    const result = await createEmailService().sendConfirmation(order);
    delivered.push({ id: String(order._id), sku: order.sku });
    return result;
  } };
  const inventory = overrides.inventory || createInventoryService(w.models.Product);
  function tracked(service, method) {
    return { [method](...args) {
      const promise = Promise.resolve().then(() => service[method](...args));
      // Resolve both outcomes in the drain list, avoiding unhandled rejections.
      pending.push(promise.then(() => undefined, () => undefined));
      return promise;
    } };
  }
  return {
    api: request(createApp(w.models, { email: tracked(email, 'sendConfirmation'), inventory: tracked(inventory, 'adjustInventory') })),
    delivered,
    async drain() { await Promise.all(pending); },
  };
}
function failure(response) {
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ error: 'The service could not complete this request.', requestId: expect.any(String) });
  expect(response.body).not.toHaveProperty('orderId');
}
async function stock(api, expected) {
  const response = await api.get('/api/orders/stock/lamp');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ sku: 'lamp', stock: expected });
}
it('confirms the order and completes both side effects', async () => {
  const f = fixture();
  try {
    const response = await f.api.post('/api/orders').send({ sku: 'lamp', quantity: 2 });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ orderId: expect.any(String), sku: 'lamp', quantity: 2 });
    const saved = await w.models.Order.findById(response.body.orderId).lean();
    expect(saved).toMatchObject({ sku: 'lamp', quantity: 2 });
    expect(f.delivered).toEqual([{ id: response.body.orderId, sku: 'lamp' }]);
    await stock(f.api, 10);
  } finally { await f.drain(); }
});
it('fails the request when the inventory update throws', async () => {
  const f = fixture({ inventory: { async adjustInventory() { throw new Error('internal-inventory-detail'); } } });
  try {
    const response = await f.api.post('/api/orders').send({ sku: 'lamp', quantity: 1 });
    failure(response);
    expect(await w.models.Order.countDocuments({ sku: 'lamp', quantity: 1 })).toBe(1);
    await stock(f.api, 12);
  } finally { await f.drain(); }
});
it('does not confirm the order when the notification fails', async () => {
  const f = fixture({ email: { async sendConfirmation() { throw new Error('internal-mail-detail'); } } });
  try {
    const response = await f.api.post('/api/orders').send({ sku: 'lamp', quantity: 1 });
    failure(response);
    expect(await w.models.Order.countDocuments({ sku: 'lamp', quantity: 1 })).toBe(1);
    // Inventory may already complete; email failure does not promise rollback.
  } finally { await f.drain(); }
});
it('decrements stock by the ordered quantity', async () => {
  const f = fixture();
  try {
    for (const body of [{}, { sku: 'lamp', quantity: 0 }, { sku: 'lamp', quantity: -1 }]) {
      const invalid = await f.api.post('/api/orders').send(body);
      expect(invalid.status).toBe(422);
      expect(invalid.body).toMatchObject({ error: expect.any(String), requestId: expect.any(String) });
    }
    expect(await w.models.Order.countDocuments()).toBe(0);
    expect(f.delivered).toEqual([]);
    await stock(f.api, 12);
    const response = await f.api.post('/api/orders').send({ sku: 'lamp', quantity: 2 });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ orderId: expect.any(String), sku: 'lamp', quantity: 2 });
    await stock(f.api, 10);
    const unknown = await f.api.get('/api/orders/stock/missing-product');
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({ error: 'Unknown product.' });
  } finally { await f.drain(); }
});
it('leaves stock untouched when the inventory update fails', async () => {
  const f = fixture();
  try {
    const response = await f.api.post('/api/orders').send({ sku: 'lamp', quantity: 99 });
    failure(response);
    await stock(f.api, 12);
    expect(await w.models.Order.countDocuments({ sku: 'lamp', quantity: 99 })).toBe(1);
  } finally { await f.drain(); }
});
