import { beforeAll, beforeEach, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
const login = async (email) => (await w.request.post('/api/auth/login').send({ email })).body.token;
it('issues a login token carrying the stored plan', async () => {
  const token = await login('maya@example.com');
  expect(jwt.decode(token).plan).toBe('free');
});
it('reflects an upgrade in the next login token', async () => {
  await w.request.post('/api/upgrade').send({ email: 'maya@example.com' });
  const token = await login('maya@example.com');
  expect(jwt.decode(token).plan).toBe('premium');
});
it('accepts the upgraded token on premium routes', async () => {
  await w.request.post('/api/upgrade').send({ email: 'maya@example.com' });
  const token = await login('maya@example.com');
  const response = await w.request.get('/api/premium/features').set('Authorization', 'Bearer ' + token);
  expect(response.status).toBe(200);
});
it('rejects a pre-upgrade token on premium routes', async () => {
  const stale = await login('maya@example.com');
  await w.request.post('/api/upgrade').send({ email: 'maya@example.com' });
  const response = await w.request.get('/api/premium/features').set('Authorization', 'Bearer ' + stale);
  expect(response.status).toBe(403);
});
it('rejects a login for an unknown account', async () => {
  expect((await w.request.post('/api/auth/login').send({ email: 'ghost@example.com' })).status).toBe(404);
});