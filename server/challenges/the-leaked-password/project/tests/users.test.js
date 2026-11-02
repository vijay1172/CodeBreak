/*
 * Challenge: The Leaked Password
 * Bug category: Sensitive data exposure
 * Scenarios: 4
 * Behavioral symptom: Public profile responses disclose private account data.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const people = [
  { id: 'student-id', name: 'Sam Student', email: 'student@example.com' },
  { id: 'admin-id', name: 'Riya Admin', email: 'admin@example.com' },
];
function publicProfile(response, person) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toEqual(expect.objectContaining({ name: person.name, email: person.email }));
  expect(response.body.id ?? response.body._id).toBe(person.id);
}
function privateValuesAbsent(value, forbiddenKeys, forbiddenValues = []) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    expect(forbiddenKeys).not.toContain(key);
    expect(forbiddenValues).not.toContain(child);
    privateValuesAbsent(child, forbiddenKeys, forbiddenValues);
  }
}
it('hides the password hash from the profile response', async () => {
  for (const person of people) {
    const response = await w.request.get('/api/users/' + person.id);
    publicProfile(response, person);
    privateValuesAbsent(response.body, ['password', 'passwordHash'], ['sha256:91d2f0aa', 'sha256:77ba91cc']);
  }
});
it('hides the admin flag from the profile response', async () => {
  for (const person of people) {
    const response = await w.request.get('/api/users/' + person.id);
    publicProfile(response, person);
    privateValuesAbsent(response.body, ['isAdmin']);
  }
});
it('still returns the public profile fields', async () => {
  for (const person of people) {
    const response = await w.request.get('/api/users/' + person.id);
    publicProfile(response, person);
  }
});
it('returns a controlled error for an unknown public profile', async () => {
  for (const id of ['missing-account', 'invalid-but-safe-identifier']) {
    const response = await w.request.get('/api/users/' + id);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No such account.' });
    privateValuesAbsent(response.body, ['password', 'passwordHash', 'isAdmin']);
    expect(response.text).not.toMatch(/sha256:|stack|mongoose/i);
  }
  // A failed lookup does not replace or corrupt the next public profile.
  for (const person of people) publicProfile(await w.request.get('/api/users/' + person.id), person);
});
