/*
 * Challenge: The Duplicate Order
 * Bug category: Request deduplication / idempotency
 * Scenarios: 5
 * Behavioral symptom: Repeated checkout submissions can create duplicate orders.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const items = () => [{ sku: 'keyboard', quantity: 2 }];
const keyboardLines = [{ sku: 'keyboard', name: 'Compact keyboard', unitCents: 4999, quantity: 2 }];
function order(response, expectedTotal = 9998, expectedLines = keyboardLines) {
  expect([200, 201]).toContain(response.status);
  expect(response.body).toEqual({
    orderId: expect.any(String), totalCents: expectedTotal,
    items: expectedLines.map((line) => expect.objectContaining(line)),
  });
}
async function persisted(response) {
  // This app has no order-read route. Inspect the existing store after the real HTTP operation.
  const stored = await w.models.Order.findById(response.body.orderId).lean();
  expect(stored).not.toBeNull();
  expect(stored.totalCents).toBe(response.body.totalCents);
  expect(stored.items.map(({ sku, name, unitCents, quantity }) => ({ sku, name, unitCents, quantity })))
    .toEqual(response.body.items.map(({ sku, name, unitCents, quantity }) => ({ sku, name, unitCents, quantity })));
}
it('creates exactly one order for a single submission', async () => {
  const response = await w.request.post('/api/orders').send({ items: items() });
  expect(response.status).toBe(201); order(response);
  expect(response.body.items).toEqual([expect.objectContaining({ sku: 'keyboard', name: 'Compact keyboard', unitCents: 4999, quantity: 2 })]);
  await persisted(response);
  expect(await w.models.Order.countDocuments()).toBe(1);
});
it('returns the existing order when the same operation key is replayed', async () => {
  const key = 'op-9f31c2';
  const first = await w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() });
  const second = await w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() });
  order(first); order(second);
  expect(first.body.orderId).toBe(second.body.orderId);
  expect(second.body.totalCents).toBe(first.body.totalCents);
  await persisted(first);
  await persisted(second);
  expect(await w.models.Order.countDocuments()).toBe(1);
});
it('keeps two identical rapid submissions to a single order', async () => {
  const key = 'op-77aa10';
  const responses = await Promise.all([
    w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() }),
    w.request.post('/api/orders').set('Idempotency-Key', key).send({ items: items() }),
  ]);
  responses.forEach((response) => order(response));
  expect(responses[0].body.orderId).toBe(responses[1].body.orderId);
  await Promise.all(responses.map((response) => persisted(response)));
  expect(await w.models.Order.countDocuments()).toBe(1);
});
it('prices the order from the seeded catalogue', async () => {
  const response = await w.request.post('/api/orders').send({ items: [
    { sku: 'mouse', quantity: 1, unitCents: 1, name: 'Spoofed' },
    { sku: 'hub', quantity: 2, unitCents: 1 },
  ] });
  expect(response.status).toBe(201); order(response, 8499, [
    { sku: 'mouse', name: 'Silent mouse', unitCents: 1999, quantity: 1 },
    { sku: 'hub', name: 'Desk hub', unitCents: 3250, quantity: 2 },
  ]);
  await persisted(response);
});
it('rejects an order without purchasable items', async () => {
  for (const invalid of [undefined, [], [{ sku: 'unknown', quantity: 1 }], [{ sku: 'keyboard', quantity: 0 }], [{ sku: 'keyboard', quantity: 1.5 }], [{ sku: 'keyboard', quantity: 100 }]]) {
    const response = await w.request.post('/api/orders').send({ items: invalid });
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
    expect(await w.models.Order.countDocuments()).toBe(0);
  }
});
