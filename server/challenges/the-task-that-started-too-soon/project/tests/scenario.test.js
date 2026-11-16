/*
 * Challenge: The Task That Started Too Soon
 * Bug category: Dependency readiness
 * Scenarios: 8
 * Behavioral symptom: A task can finish after only some of its prerequisites are complete.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineModel } from '../server/app.js';
let memory, connection, Model, api;
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri()).asPromise(); Model = defineModel(connection); api = request(createApp({ Model })); });
beforeEach(async () => { await Model.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId = 'alice') { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
const make = (authorization, title, dependsOn = []) => api.post('/api/tasks').set('Authorization', authorization).send({ title, dependsOn });
const read = (authorization, id) => api.get(`/api/tasks/${id}`).set('Authorization', authorization);
const change = (authorization, id, dependsOn) => api.patch(`/api/tasks/${id}`).set('Authorization', authorization).send({ dependsOn });
const complete = (authorization, id) => api.post(`/api/tasks/${id}/complete`).set('Authorization', authorization).send({});
it('creates and reads a task with a pending status', async () => { const alice = await auth(); const made = await make(alice, 'Design screen'); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), title: 'Design screen', dependsOn: [], status: 'pending' } }); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
it('keeps a task pending when only one of two prerequisites is done', async () => { const alice = await auth(); const first = (await make(alice, 'Design')).body.item, second = (await make(alice, 'Approve')).body.item; const main = (await make(alice, 'Launch', [first.id, second.id])).body.item; expect((await complete(alice, first.id)).status).toBe(200); const early = await complete(alice, main.id); expect(early.status).toBe(409); expect(early.body).toEqual({ error: expect.any(String) }); expect((await read(alice, main.id)).body).toEqual({ item: main }); });
it('completes a task after every prerequisite is done', async () => { const alice = await auth(); const first = (await make(alice, 'Design')).body.item, second = (await make(alice, 'Approve')).body.item; const main = (await make(alice, 'Launch', [first.id, second.id])).body.item; await complete(alice, first.id); await complete(alice, second.id); const changed = await complete(alice, main.id); expect(changed.status).toBe(200); expect(changed.body.item).toEqual({ ...main, status: 'done' }); expect((await read(alice, main.id)).body).toEqual(changed.body); });
it('allows a task with no prerequisites to complete once', async () => { const alice = await auth(); const main = (await make(alice, 'Independent')).body.item; const changed = await complete(alice, main.id); expect(changed.status).toBe(200); expect(changed.body.item.status).toBe('done'); expect((await complete(alice, main.id)).status).toBe(409); expect((await read(alice, main.id)).body).toEqual(changed.body); });
it('updates dependencies on a pending task and checks the new readiness', async () => { const alice = await auth(); const first = (await make(alice, 'First')).body.item, second = (await make(alice, 'Second')).body.item, main = (await make(alice, 'Main')).body.item; const changed = await change(alice, main.id, [first.id, second.id]); expect(changed.status).toBe(200); expect(changed.body.item.dependsOn).toEqual([first.id, second.id]); await complete(alice, first.id); expect((await complete(alice, main.id)).status).toBe(409); expect((await read(alice, main.id)).body).toEqual(changed.body); });
it('rejects invalid and cyclic dependencies without changing saved tasks', async () => { const alice = await auth(); const first = (await make(alice, 'First')).body.item, second = (await make(alice, 'Second', [first.id])).body.item; expect((await make(alice, ' ', [])).status).toBe(400); expect((await change(alice, first.id, [first.id])).status).toBe(400); expect((await change(alice, first.id, [second.id])).status).toBe(400); expect((await read(alice, first.id)).body).toEqual({ item: first }); });
it('rejects dependencies from another account and hides foreign tasks', async () => { const alice = await auth(), bob = await auth('bob'); const mine = (await make(alice, 'Mine')).body.item; expect((await make(bob, 'Foreign dependency', [mine.id])).status).toBe(400); expect((await read(bob, mine.id)).status).toBe(404); expect((await complete(bob, mine.id)).status).toBe(404); expect((await read(alice, mine.id)).body).toEqual({ item: mine }); });
it('requires a valid demo session to read and complete a task', async () => { const alice = await auth(); const mine = (await make(alice, 'Mine')).body.item; expect((await api.get(`/api/tasks/${mine.id}`)).status).toBe(401); expect((await complete('Bearer invalid', mine.id)).status).toBe(401); expect((await read(alice, mine.id)).body).toEqual({ item: mine }); });
