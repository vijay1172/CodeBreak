/*
 * Challenge: The Penny Gap
 * Bug category: Currency / numeric precision
 * Scenarios: 5
 * Behavioral symptom: Previewed and saved invoice amounts lose some of the displayed price.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => {
  await w.reset({ seedFixtures: false });
  await w.models.Product.insertMany([
    { sku: 'notebook', name: 'Studio notebook', unitPrice: '12.00' },
    { sku: 'label', name: 'Shipping label', unitPrice: '0.29' },
    { sku: 'sleeve', name: 'Card sleeve', unitPrice: '0.57' },
    { sku: 'folder', name: 'Archive folder', unitPrice: '1.13' },
    { sku: 'kit', name: 'Desk kit', unitPrice: '19.99' },
  ]);
});
afterAll(async () => { await w?.close(); });
const order = (sku, quantity) => ({ lines: [{ sku, quantity }] });
function quote(response, status, lines) {
  expect(response.status).toBe(status);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toMatchObject({
    currency: 'USD', subtotalCents: lines.reduce((sum, line) => sum + line.lineCents, 0),
    lines: lines.map(line => expect.objectContaining(line)),
  });
  expect(response.body.lines).toHaveLength(lines.length);
}
function error(response, status) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
  expect(response.body.requestId).toBe(response.headers['x-request-id']);
}
it('quotes whole-dollar products correctly', async () => {
  const products = await w.request.get('/api/products');
  expect(products.status).toBe(200);
  expect(products.body.products).toEqual(expect.arrayContaining([expect.objectContaining({ sku: 'notebook', name: 'Studio notebook', unitPrice: '12.00' })]));
  quote(await w.request.post('/api/invoices/preview').send(order('notebook', 3)), 200, [
    { sku: 'notebook', name: 'Studio notebook', quantity: 3, unitCents: 1200, lineCents: 3600 },
  ]);
  const history = await w.request.get('/api/invoices');
  expect(history.status).toBe(200);
  expect(history.body).toEqual({ invoices: [] });
});
it('preserves every cent across fractional prices and quantities', async () => {
  for (const [sku, name, cents] of [['label', 'Shipping label', 29], ['sleeve', 'Card sleeve', 57], ['folder', 'Archive folder', 113], ['kit', 'Desk kit', 1999]]) {
    for (const quantity of [1, 3, 17]) {
      quote(await w.request.post('/api/invoices/preview').send(order(sku, quantity)), 200, [
        { sku, name, quantity, unitCents: cents, lineCents: cents * quantity },
      ]);
    }
  }
  quote(await w.request.post('/api/invoices/preview').send({ lines: [{ sku: 'label', quantity: 3 }, { sku: 'folder', quantity: 2 }] }), 200, [
    { sku: 'label', name: 'Shipping label', quantity: 3, unitCents: 29, lineCents: 87 },
    { sku: 'folder', name: 'Archive folder', quantity: 2, unitCents: 113, lineCents: 226 },
  ]);
});
it('stores the invoice amount returned to the customer', async () => {
  const response = await w.request.post('/api/invoices').send(order('label', 3));
  quote(response, 201, [{ sku: 'label', name: 'Shipping label', quantity: 3, unitCents: 29, lineCents: 87 }]);
  expect(response.body).toMatchObject({ _id: expect.any(String), createdAt: expect.any(String), updatedAt: expect.any(String) });
  const history = await w.request.get('/api/invoices');
  expect(history.status).toBe(200);
  expect(history.body.invoices).toHaveLength(1);
  expect(history.body.invoices[0]).toMatchObject({ _id: response.body._id, currency: 'USD', subtotalCents: 87 });
  expect(history.body.invoices[0].lines).toEqual(response.body.lines);
});
it('rejects invalid quantities without creating invoices', async () => {
  for (const quantity of [0, -1, 1.5, 1001, '3']) error(await w.request.post('/api/invoices').send(order('notebook', quantity)), 422);
  for (const body of [{}, { lines: [] }]) error(await w.request.post('/api/invoices').send(body), 422);
  const history = await w.request.get('/api/invoices');
  expect(history.status).toBe(200);
  expect(history.body).toEqual({ invoices: [] });
});
it('returns a clear error for an unavailable product', async () => {
  await w.models.Product.create({ sku: 'inactive', name: 'Retired item', unitPrice: '3.00', active: false });
  for (const sku of ['missing', 'inactive']) {
    for (const route of ['/api/invoices/preview', '/api/invoices']) {
      const response = await w.request.post(route).send(order(sku, 1));
      error(response, 404);
      expect(response.body.error).toMatch(/available/);
    }
  }
  const history = await w.request.get('/api/invoices');
  expect(history.status).toBe(200);
  expect(history.body).toEqual({ invoices: [] });
});
