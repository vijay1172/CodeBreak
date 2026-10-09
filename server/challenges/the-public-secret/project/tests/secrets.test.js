import { readFileSync } from 'node:fs';
import { beforeAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
let constantsSource;
beforeAll(async () => {
  w = await workspace();
  process.env.STRIPE_SECRET_KEY = 'sk_test_51H8xQmVbServerSideOnly';
  constantsSource = readFileSync('client/src/config/constants.js', 'utf8');
});
it('keeps the processor secret out of the browser config', () => {
  expect(constantsSource).not.toMatch(/sk_test_[A-Za-z0-9]+/);
  expect(constantsSource).not.toMatch(/VITE_STRIPE/i);
});
it('reads the payment secret from the server environment', async () => {
  const response = await w.request.post('/api/payments/intent').send({ amountCents: 1200 });
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('requires_payment_method');
});
it('keeps the database connection string off the client', () => {
  expect(constantsSource).not.toMatch(/mongodb(\+srv)?:\/\//);
  expect(constantsSource).not.toMatch(/VITE_MONGODB/i);
});
it('rejects payment intents outside the allowed range', async () => {
  expect((await w.request.post('/api/payments/intent').send({ amountCents: 10 })).status).toBe(422);
  expect((await w.request.post('/api/payments/intent').send({ amountCents: 900000 })).status).toBe(422);
});
it('stops sourcing browser configuration from import.meta.env', () => {
  expect(constantsSource).not.toMatch(/import\.meta\.env/);
});