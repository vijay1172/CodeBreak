/*
 * Challenge: The Disappearing Preferences
 * Bug category: Partial update semantics
 * Scenarios: 8
 * Behavioral symptom: Saving one preference can erase other choices or fail to clear a saved value.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineModel } from '../server/app.js';

let memory, connection, Model, api;
const defaults = { email: true, jobs: true, reminders: false };
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri()).asPromise(); Model = defineModel(connection); api = request(createApp({ Model })); });
beforeEach(async () => { await Model.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId = 'anya') { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
const create = authorization => api.post('/api/preferences').set('Authorization', authorization).send({});
const read = (authorization, id) => api.get(`/api/preferences/${id}`).set('Authorization', authorization);
const change = (authorization, id, body) => api.patch(`/api/preferences/${id}`).set('Authorization', authorization).send(body);

it('opens a preference profile with defaults that survive a fresh read', async () => { const anya = await auth(); const made = await create(anya); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), website: null, notifications: defaults } }); expect((await read(anya, made.body.item.id)).body).toEqual(made.body); });
it('changes one notification without removing the others', async () => { const anya = await auth(); const made = await create(anya); const changed = await change(anya, made.body.item.id, { notifications: { email: false } }); expect(changed.status).toBe(200); expect(changed.body.item.notifications).toEqual({ ...defaults, email: false }); expect((await read(anya, made.body.item.id)).body).toEqual(changed.body); });
it('keeps an earlier false choice through a second partial update', async () => { const anya = await auth(); const made = await create(anya); const first = await change(anya, made.body.item.id, { notifications: { email: false } }); expect(first.status).toBe(200); const second = await change(anya, made.body.item.id, { notifications: { jobs: false } }); expect(second.status).toBe(200); expect(second.body.item.notifications).toEqual({ email: false, jobs: false, reminders: false }); expect((await read(anya, made.body.item.id)).body).toEqual(second.body); });
it('sets a website without changing notification choices', async () => { const anya = await auth(); const made = await create(anya); const changed = await change(anya, made.body.item.id, { website: 'https://anya.example' }); expect(changed.status).toBe(200); expect(changed.body.item).toEqual({ ...made.body.item, website: 'https://anya.example' }); expect((await read(anya, made.body.item.id)).body).toEqual(changed.body); });
it('clears a website explicitly while keeping existing notification choices', async () => { const anya = await auth(); const made = await create(anya); const first = await change(anya, made.body.item.id, { website: 'https://anya.example', notifications: { jobs: false } }); expect(first.status).toBe(200); const cleared = await change(anya, made.body.item.id, { website: null }); expect(cleared.status).toBe(200); expect(cleared.body.item.website).toBeNull(); expect(cleared.body.item.notifications).toEqual({ ...defaults, jobs: false }); expect((await read(anya, made.body.item.id)).body).toEqual(cleared.body); });
it('rejects invalid settings without changing what is saved', async () => { const anya = await auth(); const made = await create(anya); for (const body of [{ notifications: { email: 'no' } }, { notifications: { other: true } }, { unexpected: true }, {}]) { const rejected = await change(anya, made.body.item.id, body); expect(rejected.status).toBe(400); expect(rejected.body).toEqual({ error: expect.any(String) }); } expect((await read(anya, made.body.item.id)).body).toEqual(made.body); });
it('keeps another demo account from reading or modifying preferences', async () => { const anya = await auth(), ben = await auth('ben'); const made = await create(anya); const list = await api.get('/api/preferences').set('Authorization', ben); expect(list.status).toBe(200); expect(list.body).toEqual({ items: [] }); expect((await read(ben, made.body.item.id)).status).toBe(404); expect((await change(ben, made.body.item.id, { website: null })).status).toBe(404); expect((await read(anya, made.body.item.id)).body).toEqual(made.body); });
it('rejects unauthenticated reads and writes', async () => { const anya = await auth(); const made = await create(anya); expect((await api.get(`/api/preferences/${made.body.item.id}`)).status).toBe(401); expect((await api.patch(`/api/preferences/${made.body.item.id}`).set('Authorization', 'Bearer invalid').send({ website: null })).status).toBe(401); expect((await read(anya, made.body.item.id)).body).toEqual(made.body); });
