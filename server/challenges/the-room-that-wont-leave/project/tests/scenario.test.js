import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
it('loads the member directory from the API', async () => {
  const response = await w.request.get('/api/members');
  expect(response.status).toBe(200);
  expect(response.body.members.map(x => x.handle)).toEqual(['leo', 'maya']);
});
it('persists a member status change', async () => {
  const response = await w.request.patch('/api/members/maya/status').send({ status: 'away' });
  expect(response.status).toBe(200);
  expect((await w.models.Member.findOne({ handle: 'maya' })).status).toBe('away');
});
it('rejects unsupported presence states', async () => {
  expect((await w.request.patch('/api/members/maya/status').send({ status: 'invisible' })).status).toBe(422);
  expect((await w.models.Member.findOne({ handle: 'maya' })).status).toBe('online');
});
