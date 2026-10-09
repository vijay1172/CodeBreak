import { beforeAll, beforeEach, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
it('hides the password hash from the profile response', async () => {
  const response = await w.request.get('/api/users/student-id');
  expect(response.status).toBe(200);
  expect(response.body.password).toBeUndefined();
  expect(response.body.passwordHash).toBeUndefined();
});
it('hides the admin flag from the profile response', async () => {
  const response = await w.request.get('/api/users/admin-id');
  expect(response.status).toBe(200);
  expect(response.body.isAdmin).toBeUndefined();
});
it('still returns the public profile fields', async () => {
  const response = await w.request.get('/api/users/student-id');
  expect(response.body.name).toBe('Sam Student');
  expect(response.body.email).toBe('student@example.com');
});
it('never loads the password hash without an explicit request', async () => {
  const user = await w.models.User.findOne({ email: 'student@example.com' });
  expect(user.passwordHash).toBeUndefined();
});