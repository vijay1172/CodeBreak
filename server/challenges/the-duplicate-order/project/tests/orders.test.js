import { beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
const items = () => [{ sku: 'keyboard', quantity: 2 }];
it('creates exactly one order for a single submission', async () => {
  const response = await w.request.post('/api/orders').send({ items: items() });
  expect(response.status).toBe(201);
  expect(await w.models.Order.countDocuments()).toBe(1);
  expect(response.body.totalCents).toBe(9998);
});
it('returns the existing order when the same operation key is replayed', async () => {
  const key = 'op-9f31c2';
  const first = await w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() });
  const second = await w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() });
  expect(first.body.orderId).toBe(second.body.orderId);
  expect(await w.models.Order.countDocuments()).toBe(1);
});
it('keeps two identical rapid submissions to a single order', async () => {
  const key = 'op-77aa10';
  const [a, b] = await Promise.all([
    w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() }),
    w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() }),
  ]);
  expect(a.body.orderId).toBe(b.body.orderId);
  expect(await w.models.Order.countDocuments()).toBe(1);
});
it('prices the order from the seeded catalogue', async () => {
  const response = await w.request.post('/api/orders').send({ items: [{ sku: 'mouse', quantity: 1 }, { sku: 'hub', quantity: 2 }] });
  expect(response.body.totalCents).toBe(8499);
});
it('rejects an order without purchasable items', async () => {
  expect((await w.request.post('/api/orders').send({ items: [] })).status).toBe(422);
});