import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const order = (sku, quantity) => ({ lines: [{ sku, quantity }] });
it('quotes whole-dollar products correctly', async () => {
  const response = await w.request.post('/api/invoices/preview').send(order('notebook', 3));
  expect(response.status).toBe(200);
  expect(response.body.subtotalCents).toBe(3600);
});
it('preserves every cent across fractional prices and quantities', async () => {
  for (const [sku, cents] of [['label', 29], ['sleeve', 57], ['folder', 113], ['kit', 1999]]) {
    for (const quantity of [1, 3, 17]) {
      const response = await w.request.post('/api/invoices/preview').send(order(sku, quantity));
      expect(response.status).toBe(200);
      expect(response.body.lines[0].unitCents).toBe(cents);
      expect(response.body.subtotalCents).toBe(cents * quantity);
    }
  }
  const mixed = await w.request.post('/api/invoices/preview').send({ lines: [{ sku: 'label', quantity: 3 }, { sku: 'folder', quantity: 2 }] });
  expect(mixed.body.subtotalCents).toBe(313);
});
it('stores the invoice amount returned to the customer', async () => {
  const response = await w.request.post('/api/invoices').send(order('notebook', 2));
  expect(response.status).toBe(201);
  const saved = await w.models.Invoice.findById(response.body._id).lean();
  expect(saved.subtotalCents).toBe(2400);
  expect(saved.lines[0].quantity).toBe(2);
});
it('rejects invalid quantities without creating invoices', async () => {
  for (const quantity of [0, -1, 1.5, 1001]) expect((await w.request.post('/api/invoices').send(order('notebook', quantity))).status).toBe(422);
  expect(await w.models.Invoice.countDocuments()).toBe(0);
});
it('returns a clear error for an unavailable product', async () => {
  const response = await w.request.post('/api/invoices/preview').send(order('retired', 1));
  expect(response.status).toBe(404);
  expect(response.body.error).toMatch(/available/);
});
