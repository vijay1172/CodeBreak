/*
 * Challenge: The Repeating Feed
 * Bug category: Stable cursor pagination
 * Scenarios: 8
 * Behavioral symptom: Posts that share a page-boundary timestamp can disappear while scrolling.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, defineModel } from '../server/app.js';
let memory, connection, Model, api;
const same = '2026-10-20T10:00:00.000Z', older = '2026-10-19T10:00:00.000Z';
beforeAll(async () => { memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } }); connection = await mongoose.createConnection(memory.getUri()).asPromise(); Model = defineModel(connection); api = request(createApp({ Model })); });
beforeEach(async () => { await Model.deleteMany({}); });
afterAll(async () => { await connection?.close(); await memory?.stop(); });
async function auth(accountId = 'alice') { const response = await api.post('/api/demo/session').send({ accountId }); expect(response.status).toBe(200); return `Bearer ${response.body.token}`; }
const send = (authorization, text, publishedAt = same) => api.post('/api/posts').set('Authorization', authorization).send({ text, publishedAt });
const page = (authorization, query = '') => api.get(`/api/posts${query}`).set('Authorization', authorization);
const read = (authorization, id) => api.get(`/api/posts/${id}`).set('Authorization', authorization);
it('publishes a post and reads back its exact fields', async () => { const alice = await auth(); const made = await send(alice, 'First'); expect(made.status).toBe(201); expect(made.body).toEqual({ item: { id: expect.any(String), text: 'First', publishedAt: same } }); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
it('returns the newest page in a stable order', async () => { const alice = await auth(); await send(alice, 'Old', older); await send(alice, 'A'); await send(alice, 'B'); const result = await page(alice, '?limit=2'); expect(result.status).toBe(200); expect(result.body.items.map(item => item.text)).toEqual(['B', 'A']); expect(result.body.nextCursor).toEqual(expect.any(String)); });
it('continues through posts sharing the first page boundary time', async () => { const alice = await auth(); await send(alice, 'Old', older); await send(alice, 'A'); await send(alice, 'B'); await send(alice, 'C'); const first = await page(alice, '?limit=2'); const second = await page(alice, `?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`); expect(first.status).toBe(200); expect(second.status).toBe(200); expect([...first.body.items, ...second.body.items].map(item => item.text)).toEqual(['C', 'B', 'A', 'Old']); expect(second.body.nextCursor).toBeNull(); });
it('walks three pages without repeats or omissions', async () => { const alice = await auth(); for (const text of ['A', 'B', 'C', 'D', 'E']) await send(alice, text); let cursor, seen = []; for (let i = 0; i < 3; i += 1) { const result = await page(alice, cursor ? `?limit=2&cursor=${encodeURIComponent(cursor)}` : '?limit=2'); expect(result.status).toBe(200); seen.push(...result.body.items.map(item => item.text)); cursor = result.body.nextCursor; if (!cursor) break; } expect(seen).toEqual(['E', 'D', 'C', 'B', 'A']); expect(new Set(seen).size).toBe(5); expect(cursor).toBeNull(); });
it('handles an earlier-time boundary without repeating the first page', async () => { const alice = await auth(); await send(alice, 'Old', older); await send(alice, 'New', same); const first = await page(alice, '?limit=1'); const second = await page(alice, `?limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`); expect(first.body.items.map(item => item.text)).toEqual(['New']); expect(second.body.items.map(item => item.text)).toEqual(['Old']); expect(second.body.nextCursor).toBeNull(); });
it('rejects invalid posts, limits, and cursors without changing the feed', async () => { const alice = await auth(); const made = await send(alice, 'Valid'); expect((await send(alice, ' ', same)).status).toBe(400); expect((await page(alice, '?limit=0')).status).toBe(400); expect((await page(alice, '?cursor=bad')).status).toBe(400); const result = await page(alice); expect(result.body).toEqual({ items: [made.body.item], nextCursor: null }); });
it('keeps another account from reading a private feed post', async () => { const alice = await auth(), bob = await auth('bob'); const made = await send(alice, 'Private'); expect((await page(bob)).body).toEqual({ items: [], nextCursor: null }); expect((await read(bob, made.body.item.id)).status).toBe(404); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
it('rejects unauthenticated feed reads and publication', async () => { const alice = await auth(); const made = await send(alice, 'Private'); expect((await api.get('/api/posts')).status).toBe(401); expect((await api.post('/api/posts').set('Authorization', 'Bearer invalid').send({ text: 'Other', publishedAt: same })).status).toBe(401); expect((await read(alice, made.body.item.id)).body).toEqual(made.body); });
