import { beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
it('updates the stored name through the current profile endpoint', async () => {
  const response = await w.request.put('/api/user/profile').send({ name: 'Maya R. Chen' });
  expect(response.status).toBe(200);
  expect(response.body.name).toBe('Maya R. Chen');
  expect((await w.models.User.findOne().lean()).name).toBe('Maya R. Chen');
});
it('answers the retired profile path with a 404', async () => {
  const response = await w.request.put('/api/profile').send({ name: 'Nope' });
  expect(response.status).toBe(404);
  expect((await w.models.User.findOne().lean()).name).toBe('Maya Rivera');
});
it('rejects blank or oversized profile names', async () => {
  expect((await w.request.put('/api/user/profile').send({ name: '' })).status).toBe(422);
  expect((await w.request.put('/api/user/profile').send({ name: 'x'.repeat(90) })).status).toBe(422);
});