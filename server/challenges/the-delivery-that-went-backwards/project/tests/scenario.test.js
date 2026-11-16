/*
 * Challenge: The Delivery That Went Backwards
 * Bug category: Out-of-order event reconciliation
 * Scenarios: 8
 * Behavioral symptom: A delayed or retried courier update can regress a shipment or duplicate history.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineModel } from '../server/app.js';
let memory, connection, Model, api;
const firstTime = '2026-11-16T10:00:00.000Z', secondTime = '2026-11-16T11:00:00.000Z';
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri()).asPromise(); Model = defineModel(connection); api = request(createApp({ Model })); });
beforeEach(async () => { await Model.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId = 'seller') { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
const make = (authorization, trackingCode = 'BR-1001') => api.post('/api/shipments').set('Authorization', authorization).send({ trackingCode });
const read = (authorization, id) => api.get(`/api/shipments/${id}`).set('Authorization', authorization);
function event(eventId, status, occurredAt = firstTime) { const signature = createHmac('sha256', 'brokenrepo-demo-courier-key').update(`${eventId}|${status}|${occurredAt}`).digest('hex'); return { eventId, status, occurredAt, signature }; }
const send = (authorization, id, body) => api.post(`/api/shipments/${id}/event`).set('Authorization', authorization).send(body);
it('creates and reads a shipment with an empty event timeline', async () => { const seller = await auth(); const made = await make(seller); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), trackingCode: 'BR-1001', status: 'created', history: [] } }); expect((await read(seller, made.body.item.id)).body).toEqual(made.body); });
it('records a signed event and advances the headline stage', async () => { const seller = await auth(); const made = await make(seller); const changed = await send(seller, made.body.item.id, event('pickup-1', 'picked_up')); expect(changed.status).toBe(200); expect(changed.body.item).toEqual({ ...made.body.item, status: 'picked_up', history: [{ eventId: 'pickup-1', status: 'picked_up', occurredAt: firstTime }] }); expect((await read(seller, made.body.item.id)).body).toEqual(changed.body); });
it('does not move backward when an older stage arrives after a newer stage', async () => { const seller = await auth(); const made = await make(seller); await send(seller, made.body.item.id, event('transit-1', 'in_transit', secondTime)); const late = await send(seller, made.body.item.id, event('pickup-1', 'picked_up', firstTime)); expect(late.status).toBe(200); expect(late.body.item.status).toBe('in_transit'); expect(late.body.item.history.map(item => item.eventId)).toEqual(['transit-1', 'pickup-1']); expect((await read(seller, made.body.item.id)).body).toEqual(late.body); });
it('ignores a retry using an event ID already in the timeline', async () => { const seller = await auth(); const made = await make(seller); const first = await send(seller, made.body.item.id, event('pickup-1', 'picked_up')); expect(first.status).toBe(200); const retry = await send(seller, made.body.item.id, event('pickup-1', 'picked_up')); expect(retry.status).toBe(200); expect(retry.body).toEqual(first.body); expect((await read(seller, made.body.item.id)).body).toEqual(first.body); });
it('keeps delivered as the final headline stage despite late events', async () => { const seller = await auth(); const made = await make(seller); await send(seller, made.body.item.id, event('done-1', 'delivered', secondTime)); const late = await send(seller, made.body.item.id, event('pickup-1', 'picked_up')); expect(late.status).toBe(200); expect(late.body.item.status).toBe('delivered'); expect((await read(seller, made.body.item.id)).body).toEqual(late.body); });
it('rejects malformed and unsigned updates without changing the shipment', async () => { const seller = await auth(); const made = await make(seller); expect((await send(seller, made.body.item.id, { ...event('pickup-1', 'picked_up'), signature: '0'.repeat(64) })).status).toBe(401); expect((await send(seller, made.body.item.id, event('bad-1', 'unknown'))).status).toBe(400); expect((await make(seller, 'bad')).status).toBe(400); expect((await read(seller, made.body.item.id)).body).toEqual(made.body); });
it('keeps another seller from reading or updating a shipment', async () => { const seller = await auth(), other = await auth('other'); const made = await make(seller); expect((await api.get('/api/shipments').set('Authorization', other)).body).toEqual({ items: [] }); expect((await read(other, made.body.item.id)).status).toBe(404); expect((await send(other, made.body.item.id, event('pickup-1', 'picked_up'))).status).toBe(404); expect((await read(seller, made.body.item.id)).body).toEqual(made.body); });
it('requires a valid demo session for reads and courier updates', async () => { const seller = await auth(); const made = await make(seller); expect((await api.get(`/api/shipments/${made.body.item.id}`)).status).toBe(401); expect((await send('Bearer invalid', made.body.item.id, event('pickup-1', 'picked_up'))).status).toBe(401); expect((await read(seller, made.body.item.id)).body).toEqual(made.body); });
