/*
 * Challenge: The Invisible Update
 * Bug category: State management / API synchronization
 * Scenarios: 3
 * Behavioral symptom: A displayed name change does not survive a reload.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const profile = (body, name) => expect(body).toEqual({ id: expect.any(String), name, email: 'maya@example.com' });
it('updates the stored name through the current profile endpoint', async () => {
  const before = await w.request.get('/api/user/profile');
  expect(before.status).toBe(200); profile(before.body, 'Maya Rivera');
  const response = await w.request.put('/api/user/profile').send({ name: ' Maya R. Chen ' });
  expect(response.status).toBe(200); profile(response.body, 'Maya R. Chen');
  const after = await w.request.get('/api/user/profile');
  expect(after.status).toBe(200); profile(after.body, 'Maya R. Chen');
  expect(after.body.id).toBe(before.body.id);
});
it('answers the retired profile path with a 404', async () => {
  const response = await w.request.put('/api/profile').send({ name: 'Nope' });
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Route not found.' });
  const after = await w.request.get('/api/user/profile');
  expect(after.status).toBe(200); profile(after.body, 'Maya Rivera');
});
it('rejects blank or oversized profile names', async () => {
  for (const name of ['', ' ', 'x', 'x'.repeat(81)]) {
    const response = await w.request.put('/api/user/profile').send({ name });
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: 'Names are 2 to 80 characters.' });
    const after = await w.request.get('/api/user/profile');
    expect(after.status).toBe(200); profile(after.body, 'Maya Rivera');
  }
  await w.models.User.deleteMany({});
  for (const request of [
    w.request.get('/api/user/profile'),
    w.request.put('/api/user/profile').send({ name: 'Valid Name' }),
  ]) {
    const response = await request;
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No profile exists yet.' });
  }
});
