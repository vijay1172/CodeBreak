/*
 * Challenge: The Cart That Forgot You
 * Bug category: Cart reconciliation
 * Scenarios: 8
 * Behavioral symptom: A guest-to-account merge can mix product variants or count the same cart twice.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineModel } from '../server/app.js';
let memory, connection, Model, api;
const red = { sku: 'SHIRT', variant: 'red', quantity: 1 }, blue = { sku: 'SHIRT', variant: 'blue', quantity: 1 };
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri()).asPromise(); Model = defineModel(connection); api = request(createApp({ Model })); });
beforeEach(async () => { await Model.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId) { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
const make = (authorization, items) => api.post('/api/carts').set('Authorization', authorization).send({ items });
const read = (authorization, id) => api.get(`/api/carts/${id}`).set('Authorization', authorization);
const merge = (authorization, id, guest) => api.post(`/api/carts/${id}/merge`).set('Authorization', authorization).send({ guestCartId: guest.id, claimCode: guest.claimCode });
it('creates a guest cart whose claim code and items survive a fresh read', async () => { const guest = await auth('guest'); const made = await make(guest, [red]); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), items: [red], claimCode: expect.any(String), mergedGuestIds: [] } }); expect((await read(guest, made.body.item.id)).body).toEqual(made.body); });
it('keeps red and blue variants separate when a guest cart is merged', async () => { const guestAuth = await auth('guest'), alice = await auth('alice'); const guest = (await make(guestAuth, [red])).body.item; const mine = (await make(alice, [blue])).body.item; const changed = await merge(alice, mine.id, guest); expect(changed.status).toBe(200); expect(changed.body.item.items).toEqual([blue, red]); expect(changed.body.item.mergedGuestIds).toEqual([guest.id]); expect((await read(alice, mine.id)).body).toEqual(changed.body); });
it('combines matching variants without exceeding stock', async () => { const guestAuth = await auth('guest'), alice = await auth('alice'); const guest = (await make(guestAuth, [{ ...red, quantity: 2 }])).body.item; const mine = (await make(alice, [{ ...red, quantity: 2 }])).body.item; const changed = await merge(alice, mine.id, guest); expect(changed.status).toBe(200); expect(changed.body.item.items).toEqual([{ ...red, quantity: 3 }]); expect((await read(alice, mine.id)).body).toEqual(changed.body); });
it('leaves a customer cart unchanged when the same guest cart is merged again', async () => { const guestAuth = await auth('guest'), alice = await auth('alice'); const guest = (await make(guestAuth, [red])).body.item; const mine = (await make(alice, [red])).body.item; const first = await merge(alice, mine.id, guest); expect(first.status).toBe(200); const again = await merge(alice, mine.id, guest); expect(again.status).toBe(200); expect(again.body).toEqual(first.body); expect((await read(alice, mine.id)).body).toEqual(first.body); });
it('merges an empty guest cart without losing customer items', async () => { const guestAuth = await auth('guest'), alice = await auth('alice'); const guest = (await make(guestAuth, [])).body.item; const mine = (await make(alice, [blue])).body.item; const changed = await merge(alice, mine.id, guest); expect(changed.status).toBe(200); expect(changed.body.item.items).toEqual([blue]); expect((await read(alice, mine.id)).body).toEqual(changed.body); });
it('rejects invalid variants and claim codes without changing a cart', async () => { const guestAuth = await auth('guest'), alice = await auth('alice'); const guest = (await make(guestAuth, [red])).body.item; const mine = (await make(alice, [blue])).body.item; expect((await make(alice, [{ sku: 'SHIRT', variant: 'green', quantity: 1 }])).status).toBe(400); expect((await api.post(`/api/carts/${mine.id}/merge`).set('Authorization', alice).send({ guestCartId: guest.id, claimCode: 'wrong' })).status).toBe(404); expect((await read(alice, mine.id)).body).toEqual({ item: mine }); });
it('keeps another customer from reading or changing an account cart', async () => { const alice = await auth('alice'), bob = await auth('bob'); const mine = (await make(alice, [blue])).body.item; expect((await api.get('/api/carts').set('Authorization', bob)).body).toEqual({ items: [] }); expect((await read(bob, mine.id)).status).toBe(404); expect((await merge(bob, mine.id, { id: mine.id, claimCode: 'anything' })).status).toBe(404); expect((await read(alice, mine.id)).body).toEqual({ item: mine }); });
it('rejects cart reads and merges without a valid demo session', async () => { const alice = await auth('alice'); const mine = (await make(alice, [blue])).body.item; expect((await api.get(`/api/carts/${mine.id}`)).status).toBe(401); expect((await merge('Bearer invalid', mine.id, { id: mine.id, claimCode: 'anything' })).status).toBe(401); expect((await read(alice, mine.id)).body).toEqual({ item: mine }); });
