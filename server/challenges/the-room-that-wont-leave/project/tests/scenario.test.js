/*
 * Challenge: The Room That Won't Leave
 * Bug category: Resource lifecycle / live presence
 * Scenarios: 3 (the remaining 2 rendered scenarios are in browser.test.js)
 * Behavioral symptom: Repeated room visits duplicate notifications and delivery continues after leaving.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => {
  await w.reset({ seedFixtures: false });
  await w.models.Member.insertMany([{ handle: 'maya', name: 'Maya', status: 'online' }, { handle: 'leo', name: 'Leo', status: 'away' }]);
});
afterAll(async () => { await w?.close(); });
async function members() {
  const response = await w.request.get('/api/members');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ members: [
    expect.objectContaining({ _id: expect.any(String), handle: 'leo', name: 'Leo', status: expect.any(String) }),
    expect.objectContaining({ _id: expect.any(String), handle: 'maya', name: 'Maya', status: expect.any(String) }),
  ] });
  return response.body.members;
}
it('loads the member directory from the API', async () => {
  const records = await members();
  expect(records.map(({ handle, name, status }) => ({ handle, name, status }))).toEqual([
    { handle: 'leo', name: 'Leo', status: 'away' }, { handle: 'maya', name: 'Maya', status: 'online' },
  ]);
});
it('persists a member status change', async () => {
  const response = await w.request.patch('/api/members/maya/status').send({ status: 'away' });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ _id: expect.any(String), handle: 'maya', name: 'Maya', status: 'away', createdAt: expect.any(String), updatedAt: expect.any(String) });
  const records = await members();
  expect(records.find(item => item.handle === 'maya')).toEqual(response.body);
  const absent = await w.request.patch('/api/members/missing/status').send({ status: 'online' });
  expect(absent.status).toBe(404);
  expect(absent.body).toEqual({ error: 'Member not found.', requestId: expect.any(String) });
});
it('rejects unsupported presence states', async () => {
  for (const body of [{ status: 'invisible' }, {}]) {
    const response = await w.request.patch('/api/members/maya/status').send(body);
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
  }
  expect((await members()).find(item => item.handle === 'maya').status).toBe('online');
});
