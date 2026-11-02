/*
 * Challenge: The Public Secret
 * Bug category: Browser credential exposure.
 * Scenarios: 5.
 * Behavioral symptom: Backend credentials are delivered in public browser assets.
 */
import { afterAll, beforeAll, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { build } from 'vite';
import { withPaymentService } from './payment-process.js';

// Synthetic values only: never read a real key, URI or local .env file into this build.
const processor = 'sk_test_BrokenRepoBrowserCanary123456789';
const database = 'mongodb+srv://fixture:dummy-password@db.example.invalid/shop';
const serverOnly = 'sk_test_BrokenRepoServerOnlyCanary123456';
const starterProcessor = 'sk_test_51H8xQmVbBrokenRepoSecret';
const starterDatabase = 'mongodb+srv://cluster0.brokenrepo.mongodb.net/shop';
let assets;
let publicApi;
const environmentKeys = ['STRIPE_SECRET_KEY', 'VITE_STRIPE_SECRET_KEY', 'VITE_MONGODB_URI'];
let previous;
beforeAll(async () => {
  previous = new Map(environmentKeys.map(key => [key, process.env[key]]));
  delete process.env.VITE_STRIPE_SECRET_KEY;
  delete process.env.VITE_MONGODB_URI;
  process.env.STRIPE_SECRET_KEY = serverOnly;
  const compiled = await build({
    envFile: false,
    envPrefix: [],
    logLevel: 'silent',
    esbuild: { jsx: 'automatic' },
    define: {
      'import.meta.env.VITE_STRIPE_SECRET_KEY': JSON.stringify(processor),
      'import.meta.env.VITE_MONGODB_URI': JSON.stringify(database),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api'),
    },
    // Keep the actual production output in memory, without overwriting live preview files.
    build: { write: false },
  });
  assets = new Map((Array.isArray(compiled) ? compiled : [compiled]).flatMap(result => result.output).map(asset => [
    '/' + asset.fileName, { text: asset.type === 'chunk' ? asset.code : String(asset.source), type: asset.fileName.endsWith('.js') ? 'application/javascript' : asset.fileName.endsWith('.css') ? 'text/css' : asset.fileName.endsWith('.map') ? 'application/json' : 'text/html' },
  ]));
  const app = express();
  // Serve exact compiler outputs over HTTP. API checks use isolated real application processes.
  app.get(['/', '/index.html'], (_req, res) => res.type('html').send(assets.get('/index.html').text));
  app.use((req, res, next) => {
    const asset = assets.get(req.path);
    if (!asset) return next();
    res.type(asset.type).send(asset.text);
  });
  publicApi = request(app);
});
afterAll(() => {
  for (const [key, value] of previous || []) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
async function browserAssets() {
  const html = await publicApi.get('/');
  expect(html.status).toBe(200);
  expect(html.type).toBe('text/html');
  expect(html.text).toContain('<div id="root">');
  const texts = [html.text];
  // Inspect every emitted asset, including chunks and any source maps actually emitted.
  // This is deliberately broader than a single named source file.
  expect([...assets.keys()].some(name => name.endsWith('.js'))).toBe(true);
  for (const [url, asset] of assets) {
    const response = await publicApi.get(url);
    expect(response.status).toBe(200);
    expect(response.text).toBe(asset.text);
    texts.push(response.text);
  }
  return texts.join('\n');
}
it('keeps the processor secret out of the browser config', async () => {
  const text = await browserAssets();
  expect(text.includes(processor)).toBe(false);
  expect(text.includes(starterProcessor)).toBe(false);
});
it('reads the payment secret from the server environment', async () => {
  await withPaymentService(serverOnly, async payment => {
    const response = await payment({ amountCents: 1200 });
    expect(response.status).toBe(200);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toEqual({ status: 'requires_payment_method', amountCents: 1200, processor: 'stripe' });
    expect(JSON.stringify(response.body)).not.toContain(serverOnly);
  });
});
it('keeps the database connection string off the client', async () => {
  const text = await browserAssets();
  expect(text.includes(database)).toBe(false);
  expect(text.includes(starterDatabase)).toBe(false);
});
it('rejects payment intents outside the allowed range', async () => {
  await withPaymentService(serverOnly, async payment => {
    for (const amountCents of [undefined, 10, 900000, 50.5]) {
      const response = await payment(amountCents === undefined ? {} : { amountCents });
      expect(response.status).toBe(422);
      expect(response.body).toEqual({ error: 'Payment intents must be between 50 and 500000 cents.' });
    }
  });
});
it('preserves public payment configuration without exposing server credentials', async () => {
  const text = await browserAssets();
  expect(text.includes(serverOnly)).toBe(false);
  await withPaymentService(serverOnly, async payment => {
    for (const amountCents of [50, 500000]) {
      const response = await payment({ amountCents });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'requires_payment_method', amountCents, processor: 'stripe' });
    }
  });
  await withPaymentService(undefined, async payment => {
    const response = await payment({ amountCents: 1200 });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Payment processor is not configured.' });
    expect(JSON.stringify(response.body)).not.toContain(serverOnly);
  });
});
