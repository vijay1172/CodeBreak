/*
 * Challenge: The Ghost Cart
 * Bug category: Entitlement synchronization
 * Scenarios: 5
 * Behavioral symptom: A newly signed-in upgraded account remains on the free plan.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../server/services/tokenService.js';
import { workspace } from './helpers.js';
let w, email;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => {
  await w.reset();
  email = randomUUID() + '@example.test';
  await w.models.User.create({ email, plan: 'free' });
});
afterAll(async () => { await w?.close(); });
async function login() {
  const response = await w.request.post('/api/auth/login').send({ email });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ token: expect.any(String) });
  const claims = jwt.verify(response.body.token, jwtSecret);
  expect(claims).toEqual(expect.objectContaining({ email, plan: expect.any(String), iat: expect.any(Number), exp: expect.any(Number) }));
  return { token: response.body.token, claims };
}
async function upgrade() {
  const response = await w.request.post('/api/upgrade').send({ email });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ email, plan: 'premium' });
  expect((await w.models.User.findOne({ email }).lean()).plan).toBe('premium');
}
it('issues a login token carrying the stored plan', async () => {
  const session = await login();
  expect(session.claims.plan).toBe('free');
  const forbidden = await w.request.get('/api/premium/features').set('Authorization', 'Bearer ' + session.token);
  expect(forbidden.status).toBe(403);
  expect(forbidden.body).toEqual({ error: 'Premium plan required.' });
  for (const credential of ['', 'Bearer invalid']) {
    const response = await w.request.get('/api/premium/features').set('Authorization', credential);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required.' });
  }
});
it('reflects an upgrade in the next login token', async () => {
  await login();
  await upgrade();
  const refreshed = await login();
  expect(refreshed.claims.plan).toBe('premium');
});
it('accepts the upgraded token on premium routes', async () => {
  await login();
  await upgrade();
  const refreshed = await login();
  const response = await w.request.get('/api/premium/features').set('Authorization', 'Bearer ' + refreshed.token);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ features: ['Priority support', 'Advanced analytics'] });
});
it('rejects a pre-upgrade token on premium routes', async () => {
  const stale = await login();
  await upgrade();
  const response = await w.request.get('/api/premium/features').set('Authorization', 'Bearer ' + stale.token);
  expect(response.status).toBe(403);
  expect(response.body).toEqual({ error: 'Premium plan required.' });
});
it('rejects a login for an unknown account', async () => {
  for (const unknown of ['ghost@example.test', '', '   ']) {
    for (const route of ['/api/auth/login', '/api/upgrade']) {
      const response = await w.request.post(route).send({ email: unknown });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'No account for that email.' });
    }
  }
  expect((await login()).claims.plan).toBe('free');
  expect((await w.models.User.findOne({ email }).lean()).plan).toBe('free');
});
