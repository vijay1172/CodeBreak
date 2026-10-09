import { beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
it('serves a distinct catalogue per shop', async () => {
  const a = await w.request.get('/api/shops/shopA/categories');
  const b = await w.request.get('/api/shops/shopB/categories');
  expect(a.body.categories.map((c) => c.name)).toEqual(['Notebooks', 'Pens']);
  expect(b.body.categories.map((c) => c.name)).toEqual(['Cables', 'Controllers']);
});
it('answers an empty list for a shop without categories', async () => {
  const response = await w.request.get('/api/shops/shopC/categories');
  expect(response.status).toBe(200);
  expect(response.body.categories).toEqual([]);
});