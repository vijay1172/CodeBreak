/*
 * Challenge: One Click, Two Bookings
 * Bug category: Retry semantics / idempotency
 * Scenarios: 5
 * Behavioral symptom: One interrupted submission can save duplicate workshop bookings.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createRegistration } from '../client/src/api/createRegistration.js';
import { workspace } from './helpers.js';
let w;
const input = { workshopCode: 'debugging', attendeeEmail: 'maya@example.com', attendeeName: 'Maya' };
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const options = () => ({ baseURL: w.baseURL, makeKey: randomUUID });
function booking(value, expected = input, operationKey) {
  expect(value).toEqual(expect.objectContaining({
    _id: expect.any(String), workshopCode: expected.workshopCode,
    attendeeEmail: expected.attendeeEmail, attendeeName: expected.attendeeName,
    operationKey: expect.any(String), createdAt: expect.any(String), updatedAt: expect.any(String),
  }));
  expect(value.operationKey).toMatch(/^[a-zA-Z0-9-]{16,100}$/);
  if (operationKey !== undefined) expect(value.operationKey).toBe(operationKey);
  for (const field of ['createdAt', 'updatedAt']) {
    expect(value[field]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
    expect(Number.isNaN(Date.parse(value[field]))).toBe(false);
  }
}
async function saved() {
  const response = await w.request.get('/api/registrations');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ registrations: expect.any(Array) });
  return response.body.registrations;
}
it('creates and confirms a normal workshop booking', async () => {
  const workshops = await w.request.get('/api/workshops');
  expect(workshops.status).toBe(200);
  expect(workshops.body.workshops).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'debugging', title: expect.any(String), startsAt: expect.any(String), open: true }),
  ]));
  const result = await createRegistration(input, options());
  booking(result);
  expect(await saved()).toHaveLength(1);
  expect((await saved())[0]).toEqual(expect.objectContaining({ _id: result._id, ...input }));
});
it('replays an existing operation without inserting another booking', async () => {
  const key = randomUUID();
  const first = await w.request.post('/api/registrations').set('Idempotency-Key', key).send(input);
  const second = await w.request.post('/api/registrations').set('Idempotency-Key', key).send(input);
  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  booking(first.body, input, key); booking(second.body, input, key);
  expect(second.body._id).toBe(first.body._id);
  expect(await saved()).toHaveLength(1);
  const conflict = await w.request.post('/api/registrations').set('Idempotency-Key', key).send({ ...input, attendeeEmail: 'leo@example.com' });
  expect(conflict.status).toBe(409);
  expect(conflict.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
  expect((await saved())[0]).toEqual(expect.objectContaining({ _id: first.body._id, ...input }));
});
it('creates one booking when a committed response is lost and retried', async () => {
  let attempts = 0;
  const transport = async (...args) => {
    const response = await fetch(...args);
    attempts += 1;
    if (attempts === 1) {
      expect(response.status).toBe(201);
      await response.arrayBuffer();
      expect(await saved()).toHaveLength(1);
      throw new TypeError('Connection closed before the committed response reached the client');
    }
    return response;
  };
  const result = await createRegistration(input, { ...options(), transport });
  booking(result);
  expect(attempts).toBe(2);
  const records = await saved();
  expect(records).toHaveLength(1);
  expect(records[0]._id).toBe(result._id);
});
it('keeps independently submitted bookings distinct', async () => {
  const first = await createRegistration(input, options());
  const second = await createRegistration(input, options());
  booking(first); booking(second);
  expect(second._id).not.toBe(first._id);
  const records = await saved();
  expect(records).toHaveLength(2);
  expect(records.map((record) => record._id).sort()).toEqual([first._id, second._id].sort());
});
it('does not retry a rejected booking request', async () => {
  for (const invalid of [
    { body: { ...input, attendeeEmail: 'invalid' }, status: 422 },
    { body: { ...input, attendeeName: '' }, status: 422 },
    { body: { ...input, workshopCode: 'unavailable' }, status: 404 },
  ]) {
    let attempts = 0;
    const transport = (...args) => { attempts += 1; return fetch(...args); };
    await expect(createRegistration(invalid.body, { ...options(), transport })).rejects.toMatchObject({ status: invalid.status });
    expect(attempts).toBe(1);
    expect(await saved()).toEqual([]);
  }
  const missingKey = await w.request.post('/api/registrations').send(input);
  expect(missingKey.status).toBe(422);
  expect(missingKey.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
});
