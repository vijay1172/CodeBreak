/*
 * Challenge: The Runaway Query
 * Bug category: Unbounded directory response.
 * Scenarios: 5.
 * Behavioral symptom: A member directory becomes unusable as its dataset grows.
 */
import { afterAll, beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const directory = (query = '') => w.request.get('/api/admin/users' + query).set('x-admin-key', 'level-9-clearance');
function members(response) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toMatchObject({ users: expect.any(Array), total: expect.any(Number), page: expect.any(Number), pages: expect.any(Number) });
  for (const user of response.body.users) expect(user).toMatchObject({ name: expect.any(String), email: expect.any(String), role: 'member' });
  return response.body.users;
}
it('caps the default directory page at fifty users', async () => {
  const response = await directory();
  expect(members(response)).toHaveLength(50);
  expect(response.body.users.map(user => user.name)).toEqual(Array.from({ length: 50 }, (_, i) => 'user-' + String(i + 1).padStart(3, '0')));
});
it('serves the requested page at the requested size', async () => {
  const response = await directory('?page=2&limit=20');
  expect(members(response).map(user => user.name)).toEqual(Array.from({ length: 20 }, (_, i) => 'user-' + String(i + 21).padStart(3, '0')));
});
it('includes paging metadata for the table', async () => {
  const response = await directory('?page=2&limit=20');
  members(response);
  expect(response.body).toMatchObject({ total: 200, page: 2, pages: 10 });
  const beyond = await directory('?page=11&limit=20');
  expect(members(beyond)).toEqual([]);
  expect(beyond.body).toMatchObject({ total: 200, page: 11, pages: 10 });
});
it('requires the admin key for the directory', async () => {
  for (const key of [null, 'incorrect-clearance']) {
    const request = w.request.get('/api/admin/users');
    if (key) request.set('x-admin-key', key);
    const response = await request;
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Admin access required.' });
  }
  const invalid = await w.request.post('/api/admin/users').set('Content-Type', 'application/json').send('{');
  expect(invalid.status).toBe(400);
  expect(invalid.body).toMatchObject({ error: expect.any(String), requestId: expect.any(String) });
});
it('honors a larger request without lifting the cap', async () => {
  await w.models.User.create({ name: '000-admin', email: 'admin@example.invalid', role: 'admin' });
  const response = await directory('?limit=250');
  expect(members(response)).toHaveLength(100);
  expect(response.body).toMatchObject({ total: 200, page: 1, pages: 2 });
  expect(response.body.users.some(user => user.role !== 'member')).toBe(false);
});
