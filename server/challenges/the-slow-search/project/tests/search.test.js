/*
 * Challenge: The Slow Search
 * Bug category: Search query scalability.
 * Scenarios: 5.
 * Behavioral symptom: Correct product results require excessive database work.
 */
import { afterAll, beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const search = q => w.request.get('/api/products/search').query({ q });
function results(response) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toEqual({ results: expect.any(Array) });
  for (const product of response.body.results) {
    expect(product).toEqual({ name: expect.any(String), code: expect.any(String), priceCents: expect.any(Number), seller: expect.any(String) });
  }
  return response.body.results;
}
it('indexes the product name for search', async () => {
  const indexes = w.models.Product.schema.indexes();
  expect(indexes.some(([fields]) => Object.hasOwn(fields, 'name') || fields['$**'] === 1)).toBe(true);
  expect(results(await search('Widget 007'))).toEqual([{ name: 'Widget 007', code: 'w-7', priceCents: 907, seller: 'Gadget Grove' }]);
});
it('resolves sellers without one query per result', async () => {
  const sellerCollection = w.models.User.collection;
  const originals = new Map();
  let reads = 0;
  // Observe real collection operations, not a prescribed repository call or source string.
  for (const method of ['find', 'findOne', 'aggregate']) {
    const original = sellerCollection[method];
    originals.set(method, original);
    sellerCollection[method] = function (...args) { reads += 1; return original.apply(this, args); };
  }
  try {
    const found = results(await search('Widget'));
    expect(found).toHaveLength(50);
    expect(new Set(found.map(product => product.seller))).toEqual(new Set(['Studio Works', 'Gadget Grove', 'Bazaar Barn']));
    // A populated/batched seller lookup uses one read; an aggregation join uses none here.
    expect(reads).toBeLessThanOrEqual(1);
  } finally {
    for (const [method, original] of originals) sellerCollection[method] = original;
  }
});
it('returns a bounded full catalog response with seller details', async () => {
  const found = results(await search(''));
  expect(found).toHaveLength(50);
  expect(found.map(product => product.name)).toEqual([
    ...Array.from({ length: 40 }, (_, i) => 'Gadget ' + String(i + 1).padStart(3, '0')),
    ...Array.from({ length: 10 }, (_, i) => 'Widget ' + String(i + 1).padStart(3, '0')),
  ]);
});
it('matches products by name accurately', async () => {
  expect(results(await search('wIdGeT 007'))).toEqual([{ name: 'Widget 007', code: 'w-7', priceCents: 907, seller: 'Gadget Grove' }]);
  expect(results(await search('no-matching-product'))).toEqual([]);
  expect(results(await search('.*'))).toEqual([]);
  const lostSeller = await w.models.Product.findOne({ code: 'w-7' }).lean();
  await w.models.User.deleteOne({ _id: lostSeller.seller });
  const orphan = await search('Widget 007');
  expect(orphan.status).toBe(200);
  expect(orphan.body).toEqual({ results: [{ name: 'Widget 007', code: 'w-7', priceCents: 907, seller: null }] });
  const invalid = await search('x'.repeat(81));
  expect(invalid.status).toBe(422);
  expect(invalid.body).toEqual({ error: 'Keep searches to 80 characters or fewer.' });
});
it('keeps archived products out of search results', async () => {
  const seller = await w.models.User.findOne().lean();
  await w.models.Product.create({ code: 'active-special', name: 'Special only active', priceCents: 1234, seller: seller._id, archived: false });
  await w.models.Product.create({ code: 'archived-special', name: 'Special only archived', priceCents: 5678, seller: seller._id, archived: true });
  expect(results(await search('Special only'))).toEqual([{ code: 'active-special', name: 'Special only active', priceCents: 1234, seller: seller.name }]);
});
