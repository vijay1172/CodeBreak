/*
 * Challenge: The Frozen Dropdown
 * Bug category: Frontend navigation / data synchronization
 * Scenarios: 2
 * Behavioral symptom: Category options no longer match the selected shop after navigation.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
it('serves a distinct catalogue per shop', async () => {
  const shops = await w.request.get('/api/shops');
  expect(shops.status).toBe(200);
  expect(shops.body.shops).toEqual([
    expect.objectContaining({ shopId: 'shopA', name: 'Stationery Mart' }),
    expect.objectContaining({ shopId: 'shopB', name: 'Pixel Arcade' }),
    expect.objectContaining({ shopId: 'shopC', name: 'Empty Emporium' }),
  ]);
  for (const [id, categories] of [
    ['shopA', [{ name: 'Notebooks', kind: 'paper' }, { name: 'Pens', kind: 'writing' }]],
    ['shopB', [{ name: 'Cables', kind: 'accessory' }, { name: 'Controllers', kind: 'input' }]],
  ]) {
    const response = await w.request.get('/api/shops/' + id + '/categories');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ categories });
  }
  const invalid = await w.request.post('/api/shops').set('Content-Type', 'application/json').send('{');
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
});
it('answers an empty list for a shop without categories', async () => {
  for (const id of ['shopC', 'unknown-shop']) {
    const response = await w.request.get('/api/shops/' + id + '/categories');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ categories: [] });
  }
});
