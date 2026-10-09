import { beforeAll, beforeEach, it, expect, vi } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
const search = (q) => w.request.get('/api/products/search').query({ q });
it('indexes the product name for search', () => {
  const indexes = w.models.Product.schema.indexes().map(([fields]) => Object.keys(fields));
  expect(indexes.flat()).toContain('name');
});
it('resolves sellers without one query per result', async () => {
  const spy = vi.spyOn(w.models.User, 'findOne');
  const response = await search('widget');
  expect(response.body.results.length).toBeGreaterThan(0);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
it('answers a full catalog search quickly', async () => {
  const started = Date.now();
  await search('widget');
  expect(Date.now() - started).toBeLessThan(500);
});
it('matches products by name accurately', async () => {
  const response = await search('Widget 007');
  expect(response.body.results.map((r) => r.name)).toContain('Widget 007');
});
it('keeps archived products out of search results', async () => {
  const response = await search('Widget');
  expect(response.body.results.some((r) => Number(r.code.slice(2)) > 58)).toBe(false);
});