/*
 * Challenge: The Quiet Archive
 * Bug category: Soft-delete visibility across read paths
 * Scenarios: 7
 * Behavioral symptom: Notes removed from the active list remain visible through other ordinary reads.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';

let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });

async function token(id = 'ava') {
  const result = await w.request.post('/api/demo/session').send({ accountId: id });
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ token: expect.any(String), user: { id, name: id === 'ava' ? 'Ava' : 'Ben', role: 'editor' } });
  return result.body.token;
}
const auth = (value) => ({ Authorization: 'Bearer ' + value });
const make = (value, title = 'Launch checklist') => w.request.post('/api/documents').set(auth(value)).send({ title, body: 'Confirm venue and speakers' });
const read = (value, id) => w.request.get('/api/documents/' + id).set(auth(value));
const list = (value, path = '/api/documents') => w.request.get(path).set(auth(value));
const change = (value, id, verb) => w.request.post('/api/documents/' + id + '/' + verb).set(auth(value));
function shape(document, { title = 'Launch checklist', archived = false } = {}) {
  expect(document).toEqual({ id: expect.any(String), title, body: 'Confirm venue and speakers', archived, createdAt: expect.any(String) });
  expect(document.id).toMatch(/^[0-9a-f]{24}$/);
  expect(Number.isNaN(Date.parse(document.createdAt))).toBe(false);
}

it('creates a private note and reads back its saved fields', async () => {
  const ava = await token();
  const made = await make(ava);
  expect(made.status).toBe(201);
  expect(Object.keys(made.body)).toEqual(['document']);
  shape(made.body.document);
  const direct = await read(ava, made.body.document.id);
  expect(direct.status).toBe(200);
  expect(direct.body).toEqual(made.body);
  const active = await list(ava);
  expect(active.status).toBe(200);
  expect(active.body).toEqual({ documents: [made.body.document] });
});

it('hides an archived note from active list, title search, and direct read', async () => {
  const ava = await token();
  const made = await make(ava);
  expect(made.status).toBe(201);
  const id = made.body.document.id;
  const archived = await change(ava, id, 'archive');
  expect(archived.status).toBe(200);
  shape(archived.body.document, { archived: true });
  const active = await list(ava);
  expect(active.status).toBe(200);
  expect(active.body).toEqual({ documents: [] });
  const search = await list(ava, '/api/documents/search?q=launch');
  expect(search.status).toBe(200);
  expect(search.body).toEqual({ documents: [] });
  const direct = await read(ava, id);
  expect(direct.status).toBe(404);
  expect(direct.body).toEqual({ error: expect.any(String) });
  const archive = await list(ava, '/api/documents/archived');
  expect(archive.status).toBe(200);
  expect(archive.body).toEqual({ documents: [archived.body.document] });
});

it('restores an archived note to all active read paths', async () => {
  const ava = await token();
  const made = await make(ava);
  expect(made.status).toBe(201);
  const id = made.body.document.id;
  expect((await change(ava, id, 'archive')).status).toBe(200);
  const restored = await change(ava, id, 'restore');
  expect(restored.status).toBe(200);
  shape(restored.body.document);
  const [active, search, direct, archive] = await Promise.all([
    list(ava), list(ava, '/api/documents/search?q=launch'), read(ava, id), list(ava, '/api/documents/archived'),
  ]);
  expect(active.status).toBe(200); expect(active.body).toEqual({ documents: [restored.body.document] });
  expect(search.status).toBe(200); expect(search.body).toEqual({ documents: [restored.body.document] });
  expect(direct.status).toBe(200); expect(direct.body).toEqual(restored.body);
  expect(archive.status).toBe(200); expect(archive.body).toEqual({ documents: [] });
});

it('keeps another editor out of lists, links, and transitions', async () => {
  const ava = await token();
  const ben = await token('ben');
  const made = await make(ava);
  expect(made.status).toBe(201);
  const id = made.body.document.id;
  for (const path of ['/api/documents', '/api/documents/search?q=launch', '/api/documents/archived']) {
    const result = await list(ben, path);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ documents: [] });
  }
  for (const result of [await read(ben, id), await change(ben, id, 'archive'), await change(ben, id, 'restore')]) {
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: expect.any(String) });
  }
  const owner = await read(ava, id);
  expect(owner.status).toBe(200);
  expect(owner.body).toEqual(made.body);
});

it('rejects invalid note and search input without creating a record', async () => {
  const ava = await token();
  for (const body of [{ title: '', body: 'Text' }, { title: 'Title', body: '   ' }, { title: 7, body: 'Text' }]) {
    const response = await w.request.post('/api/documents').set(auth(ava)).send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
  }
  const search = await list(ava, '/api/documents/search?q=');
  expect(search.status).toBe(400);
  expect(search.body).toEqual({ error: expect.any(String) });
  const active = await list(ava);
  expect(active.body).toEqual({ documents: [] });
});

it('requires authentication and leaves notes unchanged after rejected requests', async () => {
  const ava = await token();
  const made = await make(ava);
  expect(made.status).toBe(201);
  const id = made.body.document.id;
  const unauthenticated = await w.request.get('/api/documents/' + id);
  const invalid = await w.request.post('/api/documents/' + id + '/archive').set('Authorization', 'Bearer invalid');
  for (const result of [unauthenticated, invalid]) {
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: expect.any(String) });
  }
  expect((await read(ava, id)).body).toEqual(made.body);
});

it('rejects repeated archive or restore while preserving the saved state', async () => {
  const ava = await token();
  const made = await make(ava);
  expect(made.status).toBe(201);
  const id = made.body.document.id;
  const before = await change(ava, id, 'restore');
  expect(before.status).toBe(409);
  expect(before.body).toEqual({ error: expect.any(String) });
  const archived = await change(ava, id, 'archive');
  expect(archived.status).toBe(200);
  const again = await change(ava, id, 'archive');
  expect(again.status).toBe(409);
  expect(again.body).toEqual({ error: expect.any(String) });
  const stored = await list(ava, '/api/documents/archived');
  expect(stored.body).toEqual({ documents: [archived.body.document] });
});
