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
it('creates and confirms a normal workshop booking', async () => {
  const result = await createRegistration(input, options());
  expect(result.attendeeName).toBe('Maya');
  expect(await w.models.Registration.countDocuments()).toBe(1);
  expect((await w.models.Registration.findById(result._id)).workshopCode).toBe('debugging');
});
it('replays an existing operation without inserting another booking', async () => {
  const key = randomUUID();
  const first = await w.request.post('/api/registrations').set('Idempotency-Key', key).send(input);
  const second = await w.request.post('/api/registrations').set('Idempotency-Key', key).send(input);
  expect(first.status).toBe(201);
  expect(second.body._id).toBe(first.body._id);
  expect(await w.models.Registration.countDocuments()).toBe(1);
  const conflict = await w.request.post('/api/registrations').set('Idempotency-Key', key).send({ ...input, attendeeEmail: 'leo@example.com' });
  expect(conflict.status).toBe(409);
});
it('creates one booking when a committed response is lost and retried', async () => {
  let attempts = 0;
  const transport = async (...args) => {
    const response = await fetch(...args);
    attempts++;
    if (attempts === 1) {
      expect(response.status).toBe(201);
      await response.arrayBuffer();
      expect(await w.models.Registration.countDocuments()).toBe(1);
      throw new TypeError('Connection closed before the client received the committed response');
    }
    return response;
  };
  const result = await createRegistration(input, { ...options(), transport });
  expect(attempts).toBe(2);
  expect(await w.models.Registration.countDocuments()).toBe(1);
  expect((await w.models.Registration.findOne())._id.toString()).toBe(result._id);
});
it('keeps independently submitted bookings distinct', async () => {
  const first = await createRegistration(input, options());
  const second = await createRegistration(input, options());
  expect(second._id).not.toBe(first._id);
  expect(await w.models.Registration.countDocuments()).toBe(2);
});
it('does not retry a rejected booking request', async () => {
  let attempts = 0;
  const transport = (...args) => { attempts++; return fetch(...args); };
  await expect(createRegistration({ ...input, attendeeEmail: 'invalid' }, { ...options(), transport })).rejects.toMatchObject({ status: 422 });
  expect(attempts).toBe(1);
  expect(await w.models.Registration.countDocuments()).toBe(0);
});
