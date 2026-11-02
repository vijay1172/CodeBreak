/*
 * Challenge: The Split Shipment
 * Bug category: Multi-step workflow state
 * Scenarios: 7
 * Behavioral symptom: An order can keep an incomplete status after every item has shipped.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineOrder } from '../server/app.js';

let memory, connection, Order, api;
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri(), { dbName: 'split-shipment-test' }).asPromise(); Order = defineOrder(connection); await Order.init(); api = request(createApp({ Order })); });
beforeEach(async () => { await Order.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId = 'alex') { const result = await api.post('/api/demo/session').send({ accountId }); expect(result.status).toBe(200); return `Bearer ${result.body.token}`; }
const orderData = { lines: [{ sku: 'mug', quantity: 2 }, { sku: 'notebook', quantity: 1 }] };
const order = (authorization, body = orderData) => api.post('/api/orders').set('Authorization', authorization).send(body);
const read = (authorization, id) => api.get(`/api/orders/${id}`).set('Authorization', authorization);
const ship = (authorization, id, lines) => api.post(`/api/orders/${id}/ship`).set('Authorization', authorization).send({ lines });
function assertOrder(response, status, shipped = [0, 0]) { expect(response.body).toEqual({ order: { id: expect.stringMatching(/^[0-9a-f]{24}$/), ownerId: 'alex', lines: [{ sku: 'mug', name: 'Ceramic mug', quantity: 2, shipped: shipped[0] }, { sku: 'notebook', name: 'Field notebook', quantity: 1, shipped: shipped[1] }], status, createdAt: expect.any(String) } }); }

it('creates a customer order with its requested quantities and reads it back', async () => { const a = await auth(); const made = await order(a); expect(made.status).toBe(201); assertOrder(made, 'pending'); const saved = await read(a, made.body.order.id); expect(saved.status).toBe(200); expect(saved.body).toEqual(made.body); const list = await api.get('/api/orders').set('Authorization', a); expect(list.body).toEqual({ orders: [made.body.order] }); });
it('records a partial shipment without changing unshipped line quantities', async () => { const a = await auth(); const made = await order(a); expect(made.status).toBe(201); const sent = await ship(a, made.body.order.id, [{ sku: 'mug', quantity: 1 }]); expect(sent.status).toBe(200); assertOrder(sent, 'partial', [1, 0]); const saved = await read(a, made.body.order.id); expect(saved.body).toEqual(sent.body); });
it('marks an order shipped after two shipments complete every line', async () => { const a = await auth(); const made = await order(a); expect(made.status).toBe(201); const first = await ship(a, made.body.order.id, [{ sku: 'mug', quantity: 1 }]); expect(first.status).toBe(200); const last = await ship(a, made.body.order.id, [{ sku: 'mug', quantity: 1 }, { sku: 'notebook', quantity: 1 }]); expect(last.status).toBe(200); assertOrder(last, 'shipped', [2, 1]); const saved = await read(a, made.body.order.id); expect(saved.body).toEqual(last.body); });
it('rejects shipping more than remains and preserves the saved order', async () => { const a = await auth(); const made = await order(a); expect(made.status).toBe(201); const bad = await ship(a, made.body.order.id, [{ sku: 'mug', quantity: 3 }]); expect(bad.status).toBe(409); expect(bad.body).toEqual({ error: expect.any(String) }); const saved = await read(a, made.body.order.id); assertOrder(saved, 'pending'); });
it('rejects malformed order and shipment quantities without inserting changes', async () => { const a = await auth(); for (const body of [{ lines: [] }, { lines: [{ sku: 'mug', quantity: 0 }] }, { lines: [{ sku: 'unknown', quantity: 1 }] }]) { const bad = await order(a, body); expect(bad.status).toBe(400); expect(bad.body).toEqual({ error: expect.any(String) }); } const made = await order(a); expect(made.status).toBe(201); const badShip = await ship(a, made.body.order.id, [{ sku: 'mug', quantity: -1 }]); expect(badShip.status).toBe(400); const saved = await read(a, made.body.order.id); assertOrder(saved, 'pending'); });
it('keeps another customer from reading or shipping the order', async () => { const a = await auth('alex'), b = await auth('bailey'); const made = await order(a); expect(made.status).toBe(201); const list = await api.get('/api/orders').set('Authorization', b); expect(list.body).toEqual({ orders: [] }); const foreignRead = await read(b, made.body.order.id); expect(foreignRead.status).toBe(404); expect(foreignRead.body).toEqual({ error: expect.any(String) }); const foreignShip = await ship(b, made.body.order.id, [{ sku: 'mug', quantity: 1 }]); expect(foreignShip.status).toBe(404); const saved = await read(a, made.body.order.id); assertOrder(saved, 'pending'); });
it('requires a signed demo session for all order reads and changes', async () => { const a = await auth(); const made = await order(a); expect(made.status).toBe(201); const noAuth = await api.get(`/api/orders/${made.body.order.id}`); expect(noAuth.status).toBe(401); expect(noAuth.body).toEqual({ error: expect.any(String) }); const invalid = await ship('Bearer invalid', made.body.order.id, [{ sku: 'mug', quantity: 1 }]); expect(invalid.status).toBe(401); const saved = await read(a, made.body.order.id); assertOrder(saved, 'pending'); });
