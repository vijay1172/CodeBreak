/*
 * Challenge: The Inbox That Reads Ahead
 * Bug category: Bounded state transition
 * Scenarios: 8
 * Behavioral symptom: A read action can acknowledge notifications that arrived after the selected message.
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
const send = (authorization, message) => api.post('/api/notifications').set('Authorization', authorization).send({ message });
const list = authorization => api.get('/api/notifications').set('Authorization', authorization);
const read = (authorization, id) => api.get(`/api/notifications/${id}`).set('Authorization', authorization);
const mark = (authorization, id) => api.post(`/api/notifications/${id}/read-through`).set('Authorization', authorization).send({});
it('creates and reads an unread notification with the correct badge', async () => { const alice = await auth(); const made = await send(alice, 'First'); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), message: 'First', sequence: 1, read: false }, unreadCount: 1 }); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
it('keeps later messages unread when marking through the first message', async () => { const alice = await auth(); const first = (await send(alice, 'First')).body.item; await send(alice, 'Second'); await send(alice, 'Third'); const changed = await mark(alice, first.id); expect(changed.status).toBe(200); expect(changed.body.item).toEqual({ ...first, read: true }); expect(changed.body.unreadCount).toBe(2); expect((await list(alice)).body.items.map(item => item.read)).toEqual([true, false, false]); });
it('marks all earlier messages and the selected middle message read', async () => { const alice = await auth(); await send(alice, 'First'); const middle = (await send(alice, 'Second')).body.item; await send(alice, 'Third'); const changed = await mark(alice, middle.id); expect(changed.status).toBe(200); expect(changed.body.unreadCount).toBe(1); expect((await list(alice)).body.items.map(item => item.read)).toEqual([true, true, false]); });
it('makes the badge zero after marking through the newest message', async () => { const alice = await auth(); await send(alice, 'First'); const newest = (await send(alice, 'Second')).body.item; const changed = await mark(alice, newest.id); expect(changed.status).toBe(200); expect(changed.body.unreadCount).toBe(0); expect((await list(alice)).body).toMatchObject({ unreadCount: 0 }); });
it('leaves a later arrival unread after an earlier read action', async () => { const alice = await auth(); const first = (await send(alice, 'First')).body.item; await mark(alice, first.id); const next = await send(alice, 'New arrival'); expect(next.status).toBe(201); expect(next.body.unreadCount).toBe(1); const inbox = await list(alice); expect(inbox.body.items.map(item => item.read)).toEqual([true, false]); expect(inbox.body.unreadCount).toBe(1); });
it('rejects blank messages without changing the inbox', async () => { const alice = await auth(); const made = await send(alice, 'First'); const rejected = await send(alice, '   '); expect(rejected.status).toBe(400); expect(rejected.body).toEqual({ error: expect.any(String) }); expect((await list(alice)).body).toEqual({ items: [made.body.item], unreadCount: 1 }); });
it('keeps another account from reading or acknowledging messages', async () => { const alice = await auth(), bob = await auth('bob'); const made = await send(alice, 'Private'); expect((await list(bob)).body).toEqual({ items: [], unreadCount: 0 }); expect((await read(bob, made.body.item.id)).status).toBe(404); expect((await mark(bob, made.body.item.id)).status).toBe(404); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
it('rejects reads and actions without a valid demo session', async () => { const alice = await auth(); const made = await send(alice, 'Private'); expect((await api.get(`/api/notifications/${made.body.item.id}`)).status).toBe(401); expect((await mark('Bearer invalid', made.body.item.id)).status).toBe(401); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
