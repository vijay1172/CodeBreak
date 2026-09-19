import { beforeAll, beforeEach, afterAll, afterEach, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { workspace } from './helpers.js';
let w, api;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); api = request(createApp(w.models)); });
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await w?.close(); });
it('returns the requested translation on a cold lookup', async () => {
  const response = await api.get('/api/products/mug?locale=fr');
  expect(response.status).toBe(200);
  expect(response.body.title).toBe('Tasse de voyage');
  expect(response.body.priceCents).toBe(1500);
});
it('reuses cached data for repeated equivalent requests', async () => {
  const find = vi.spyOn(w.models.Product, 'findOne');
  const first = await api.get('/api/products/bag?locale=en');
  const second = await api.get('/api/products/bag?locale=en');
  expect(first.status).toBe(200);
  expect(second.body).toEqual(first.body);
  expect(find).toHaveBeenCalledTimes(1);
});
it('keeps product translations independent across warmed cache entries', async () => {
  for (const [sku, translations] of [['mug', { en: 'Travel mug', fr: 'Tasse de voyage', es: 'Taza de viaje' }], ['bag', { en: 'Canvas bag', fr: 'Sac en toile', es: 'Bolsa de lona' }]]) {
    for (const locale of ['en', 'fr', 'es', 'en', 'fr']) {
      const response = await api.get('/api/products/' + sku + '?locale=' + locale);
      expect(response.status).toBe(200);
      expect(response.body.title).toBe(translations[locale]);
      expect(response.body.locale).toBe(locale);
    }
  }
});
it('rejects unsupported locales', async () => {
  expect((await api.get('/api/products/mug?locale=unknown')).status).toBe(422);
});
it('returns 404 rather than caching a missing product', async () => {
  expect((await api.get('/api/products/missing?locale=en')).status).toBe(404);
  expect((await api.get('/api/products/missing?locale=fr')).status).toBe(404);
});
