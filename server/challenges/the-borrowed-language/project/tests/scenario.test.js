/*
 * Challenge: The Borrowed Language
 * Bug category: Caching / response isolation
 * Scenarios: 5
 * Behavioral symptom: Product text sometimes remains in a previously requested language.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { workspace } from './helpers.js';
let w, api;
const products = [
  { sku: 'mug', priceCents: 1500, translations: {
    en: { title: 'Travel mug', summary: 'A cup for your commute.' },
    fr: { title: 'Tasse de voyage', summary: 'Une tasse pour vos trajets.' },
    es: { title: 'Taza de viaje', summary: 'Una taza para tus viajes.' },
  } },
  { sku: 'bag', priceCents: 2400, translations: {
    en: { title: 'Canvas bag', summary: 'Carry the essentials.' },
    fr: { title: 'Sac en toile', summary: 'Emportez vos essentiels.' },
    es: { title: 'Bolsa de lona', summary: 'Lleva lo esencial.' },
  } },
];
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => {
  await w.reset({ seedFixtures: false });
  await w.models.Product.insertMany(products);
  // Cache ownership is per application instance, never shared between scenarios.
  api = request(createApp(w.models));
});
afterAll(async () => { await w?.close(); });
function product(response, sku, locale) {
  const fixture = products.find(item => item.sku === sku);
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toEqual({ sku, priceCents: fixture.priceCents, locale, ...fixture.translations[locale] });
}
function error(response, status) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
}
it('returns the requested translation on a cold lookup', async () => {
  product(await api.get('/api/products/mug?locale=fr'), 'mug', 'fr');
  const independent = request(createApp(w.models));
  product(await independent.get('/api/products/bag'), 'bag', 'en');
  const list = await api.get('/api/products');
  expect(list.status).toBe(200);
  expect(list.body.products).toEqual([
    expect.objectContaining({ sku: 'bag', priceCents: 2400 }),
    expect.objectContaining({ sku: 'mug', priceCents: 1500 }),
  ]);
});
it('returns consistent data for repeated equivalent requests', async () => {
  const first = await api.get('/api/products/bag?locale=en');
  product(first, 'bag', 'en');
  for (let repeat = 0; repeat < 3; repeat++) {
    const next = await api.get('/api/products/bag?locale=en');
    product(next, 'bag', 'en');
    expect(next.body).toEqual(first.body);
  }
});
it('keeps product translations independent across warmed cache entries', async () => {
  for (const initial of ['en', 'fr', 'es']) {
    const independent = request(createApp(w.models));
    for (const locale of [initial, ...['en', 'fr', 'es'], initial]) {
      for (const sku of ['mug', 'bag']) product(await independent.get('/api/products/' + sku + '?locale=' + locale), sku, locale);
    }
  }
});
it('rejects unsupported locales', async () => {
  product(await api.get('/api/products/mug?locale=en'), 'mug', 'en');
  for (const locale of ['unknown', 'de']) error(await api.get('/api/products/mug').query({ locale }), 422);
  product(await api.get('/api/products/mug?locale=en'), 'mug', 'en');
});
it('returns 404 rather than caching a missing product', async () => {
  for (const locale of ['en', 'fr', 'en']) {
    const response = await api.get('/api/products/missing').query({ locale });
    error(response, 404);
    expect(response.body.error).toBe('Product not found.');
  }
  product(await api.get('/api/products/bag?locale=es'), 'bag', 'es');
});
