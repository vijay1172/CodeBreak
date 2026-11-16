/*
 * Challenge: The Receipt That Changed
 * Bug category: Historical snapshot integrity
 * Scenarios: 8
 * Behavioral symptom: A past order receipt can change after its source product or address is edited.
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
async function auth(accountId = 'isha') { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
async function prepare(accountId = 'isha') { const authorization = await auth(accountId); const seed = await api.post('/api/demo/seed').set('Authorization', authorization).send({}); expect(seed.status).toBe(200); return authorization; }
const create = (authorization, body = { productKey: 'lamp', addressKey: 'home', quantity: 2 }) => api.post('/api/orders').set('Authorization', authorization).send(body);
const read = (authorization, id) => api.get(`/api/orders/${id}`).set('Authorization', authorization);
const act = (authorization, id, name, body) => api.post(`/api/orders/${id}/${name}`).set('Authorization', authorization).send(body);
it('creates and reads a receipt with the checkout-time purchase details', async () => { const isha = await prepare(); const made = await create(isha); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), productKey: 'lamp', addressKey: 'home', quantity: 2, receipt: { productName: 'Desk lamp', unitPriceCents: 2500, addressLine: '12 Oak Road', totalCents: 5000 } } }); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
it('keeps the original receipt when the catalogue price changes', async () => { const isha = await prepare(); const made = await create(isha); const changed = await act(isha, made.body.item.id, 'catalogue', { name: 'Desk lamp', priceCents: 3000 }); expect(changed.status).toBe(200); expect(changed.body.item.receipt).toEqual(made.body.item.receipt); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
it('keeps the original product name after a catalogue rename', async () => { const isha = await prepare(); const made = await create(isha); const changed = await act(isha, made.body.item.id, 'catalogue', { name: 'Reading lamp', priceCents: 2500 }); expect(changed.status).toBe(200); expect(changed.body.item.receipt).toEqual(made.body.item.receipt); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
it('keeps the original shipping line after the address book changes', async () => { const isha = await prepare(); const made = await create(isha); const changed = await act(isha, made.body.item.id, 'address', { line: '45 River Lane' }); expect(changed.status).toBe(200); expect(changed.body.item.receipt).toEqual(made.body.item.receipt); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
it('uses current source details for a new order without rewriting an older order', async () => { const isha = await prepare(); const first = await create(isha); await act(isha, first.body.item.id, 'catalogue', { name: 'Reading lamp', priceCents: 3000 }); const second = await create(isha, { productKey: 'lamp', addressKey: 'home', quantity: 1 }); expect(second.status).toBe(201); expect(second.body.item.receipt).toEqual({ productName: 'Reading lamp', unitPriceCents: 3000, addressLine: '12 Oak Road', totalCents: 3000 }); expect((await read(isha, first.body.item.id)).body).toEqual(first.body); });
it('rejects invalid orders and source edits without modifying a receipt', async () => { const isha = await prepare(); const made = await create(isha); for (const body of [{ productKey: 'lamp', addressKey: 'home', quantity: 0 }, { productKey: 'unknown', addressKey: 'home', quantity: 1 }]) expect((await create(isha, body)).status).toBe(400); expect((await act(isha, made.body.item.id, 'catalogue', { name: 'Changed', priceCents: -1 })).status).toBe(400); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
it('keeps another demo account from reading or changing an order', async () => { const isha = await prepare(), raj = await prepare('raj'); const made = await create(isha); expect((await api.get('/api/orders').set('Authorization', raj)).body).toEqual({ items: [] }); expect((await read(raj, made.body.item.id)).status).toBe(404); expect((await act(raj, made.body.item.id, 'address', { line: 'Other' })).status).toBe(404); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
it('rejects reads and writes without a valid demo session', async () => { const isha = await prepare(); const made = await create(isha); expect((await api.get(`/api/orders/${made.body.item.id}`)).status).toBe(401); expect((await act('Bearer invalid', made.body.item.id, 'address', { line: 'Other' })).status).toBe(401); expect((await read(isha, made.body.item.id)).body).toEqual(made.body); });
