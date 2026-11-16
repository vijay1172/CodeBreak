/*
 * Challenge: The Travelling Form
 * Bug category: Stateful form identity
 * Scenarios: 8
 * Behavioral symptom: Changing the order of expense rows can change which description belongs to an amount.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineModel } from '../server/app.js';

let memory, connection, Model, api;
const items = [{ id: 'taxi', description: 'Taxi', amountCents: 900 }, { id: 'lunch', description: 'Lunch', amountCents: 1200 }];
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri()).asPromise(); Model = defineModel(connection); api = request(createApp({ Model })); });
beforeEach(async () => { await Model.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId = 'maya') { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
const create = (authorization, body = { title: 'Client visit', items }) => api.post('/api/reports').set('Authorization', authorization).send(body);
const read = (authorization, id) => api.get(`/api/reports/${id}`).set('Authorization', authorization);
const update = (authorization, id, expenses) => api.patch(`/api/reports/${id}`).set('Authorization', authorization).send({ items: expenses });

it('creates a report whose saved rows and total match the submitted form', async () => { const maya = await auth(); const made = await create(maya); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), title: 'Client visit', items, totalCents: 2100, submitted: false } }); const saved = await read(maya, made.body.item.id); expect(saved.status).toBe(200); expect(saved.body).toEqual(made.body); });
it('keeps each expense intact when rows are reordered', async () => { const maya = await auth(); const made = await create(maya); const reordered = [items[1], items[0]]; const changed = await update(maya, made.body.item.id, reordered); expect(changed.status).toBe(200); expect(changed.body.item.items).toEqual(reordered); expect(changed.body.item.totalCents).toBe(2100); const saved = await read(maya, made.body.item.id); expect(saved.body).toEqual(changed.body); });
it('preserves existing rows when one is removed and a new row is added', async () => { const maya = await auth(); const made = await create(maya); const next = [items[1], { id: 'train', description: 'Train', amountCents: 700 }]; const changed = await update(maya, made.body.item.id, next); expect(changed.status).toBe(200); expect(changed.body.item.items).toEqual(next); expect(changed.body.item.totalCents).toBe(1900); expect((await read(maya, made.body.item.id)).body).toEqual(changed.body); });
it('saves edited descriptions and amounts together', async () => { const maya = await auth(); const made = await create(maya); const next = [{ ...items[0], description: 'Airport taxi', amountCents: 1100 }, items[1]]; const changed = await update(maya, made.body.item.id, next); expect(changed.status).toBe(200); expect(changed.body.item.items).toEqual(next); expect(changed.body.item.totalCents).toBe(2300); expect((await read(maya, made.body.item.id)).body).toEqual(changed.body); });
it('submits the final report and rejects later edits', async () => { const maya = await auth(); const made = await create(maya); const submitted = await api.post(`/api/reports/${made.body.item.id}/submit`).set('Authorization', maya).send({}); expect(submitted.status).toBe(200); expect(submitted.body.item).toEqual({ ...made.body.item, submitted: true }); expect((await update(maya, made.body.item.id, [...items].reverse())).status).toBe(409); expect((await api.post(`/api/reports/${made.body.item.id}/submit`).set('Authorization', maya).send({})).status).toBe(409); expect((await read(maya, made.body.item.id)).body).toEqual(submitted.body); });
it('rejects invalid rows without changing the saved report', async () => { const maya = await auth(); const made = await create(maya); for (const invalid of [[items[0], { ...items[1], id: 'taxi' }], [{ ...items[0], amountCents: -1 }], []]) { const rejected = await update(maya, made.body.item.id, invalid); expect(rejected.status).toBe(400); expect(rejected.body).toEqual({ error: expect.any(String) }); } expect((await read(maya, made.body.item.id)).body).toEqual(made.body); });
it('keeps another demo account from listing, reading, or updating the report', async () => { const maya = await auth(), leo = await auth('leo'); const made = await create(maya); const list = await api.get('/api/reports').set('Authorization', leo); expect(list.status).toBe(200); expect(list.body).toEqual({ items: [] }); expect((await read(leo, made.body.item.id)).status).toBe(404); expect((await update(leo, made.body.item.id, items)).status).toBe(404); expect((await read(maya, made.body.item.id)).body).toEqual(made.body); });
it('rejects reads and writes without a valid demo session', async () => { const maya = await auth(); const made = await create(maya); expect((await api.get(`/api/reports/${made.body.item.id}`)).status).toBe(401); expect((await api.patch(`/api/reports/${made.body.item.id}`).set('Authorization', 'Bearer invalid').send({ items })).status).toBe(401); expect((await read(maya, made.body.item.id)).body).toEqual(made.body); });
