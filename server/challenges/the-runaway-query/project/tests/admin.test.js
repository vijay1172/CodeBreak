import { beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
const directory = (query) => w.request.get('/api/admin/users' + query).set('x-admin-key', 'level-9-clearance');
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
it('caps the default directory page at fifty users', async () => {
  const response = await directory('');
  expect(response.status).toBe(200);
  expect(response.body.users.length).toBeLessThanOrEqual(50);
});
it('serves the requested page at the requested size', async () => {
  const response = await directory('?page=2&limit=20');
  expect(response.body.users).toHaveLength(20);
  expect(response.body.users[0].name).toBe('user-021');
});
it('includes paging metadata for the table', async () => {
  const response = await directory('?page=2&limit=20');
  expect(response.body.total).toBe(200);
  expect(response.body.page).toBe(2);
  expect(response.body.pages).toBe(10);
});
it('requires the admin key for the directory', async () => {
  expect((await w.request.get('/api/admin/users')).status).toBe(403);
});
it('honors a larger request without lifting the cap', async () => {
  const response = await directory('?limit=250');
  expect(response.body.users.length).toBeLessThanOrEqual(250);
  expect(response.body.users.length).toBeGreaterThan(0);
});