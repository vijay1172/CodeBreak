/*
 * Challenge: The Split Import
 * Bug category: File import / CSV parsing
 * Scenarios: 5
 * Behavioral symptom: Valid spreadsheet exports are rejected or fail to preserve complete contact notes.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset({ seedFixtures: false }); });
afterAll(async () => { await w?.close(); });
const header = 'email,name,company,notes\r\n';
const upload = (text, filename = 'contacts.csv') => w.request.post('/api/imports').attach('file', Buffer.from(text), { filename, contentType: 'text/csv' });
function batch(response, counts) {
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ _id: expect.any(String), filename: 'contacts.csv', ...counts, createdAt: expect.any(String), updatedAt: expect.any(String) });
}
async function directory() {
  const response = await w.request.get('/api/contacts');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ contacts: expect.any(Array) });
  return response.body.contacts;
}
async function history() {
  const response = await w.request.get('/api/imports');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ batches: expect.any(Array) });
  return response.body.batches;
}
function rejected(response) {
  expect(response.status).toBe(422);
  expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
}
it('imports ordinary contacts and quoted commas', async () => {
  const response = await upload(header + 'MAYA@example.com, Maya ,"Atlas, Inc.",Call on Tuesday\r\n');
  batch(response, { rows: 1, created: 1, updated: 0 });
  expect(await directory()).toEqual([expect.objectContaining({ email: 'maya@example.com', name: 'Maya', company: 'Atlas, Inc.', notes: 'Call on Tuesday' })]);
  expect(await history()).toEqual([expect.objectContaining({ _id: response.body._id, filename: 'contacts.csv', rows: 1, created: 1, updated: 0 })]);
});
it('preserves complete records containing multiline quoted notes', async () => {
  const text = '\uFEFF' + header + 'maya@example.com,Maya,Atlas,"Dock 3\r\nAsk for ""Sam"", after 10"\r\nleo@example.com,Leo,Beacon,"First floor\nSide entrance"\r\n';
  const response = await upload(text);
  batch(response, { rows: 2, created: 2, updated: 0 });
  expect(await directory()).toEqual([
    expect.objectContaining({ email: 'leo@example.com', name: 'Leo', company: 'Beacon', notes: 'First floor\nSide entrance' }),
    expect.objectContaining({ email: 'maya@example.com', name: 'Maya', company: 'Atlas', notes: 'Dock 3\r\nAsk for "Sam", after 10' }),
  ]);
  expect(await history()).toEqual([expect.objectContaining({ _id: response.body._id, rows: 2, created: 2, updated: 0 })]);
});
it('updates existing contacts without duplicating them', async () => {
  batch(await upload(header + 'maya@example.com,Maya,Atlas,Old note\n'), { rows: 1, created: 1, updated: 0 });
  const response = await upload(header + 'MAYA@example.com,Maya,Atlas,New note\n');
  batch(response, { rows: 1, created: 0, updated: 1 });
  expect(await directory()).toEqual([expect.objectContaining({ email: 'maya@example.com', name: 'Maya', company: 'Atlas', notes: 'New note' })]);
  const batches = await history();
  expect(batches).toHaveLength(2);
  expect(batches).toEqual(expect.arrayContaining([expect.objectContaining({ _id: response.body._id, rows: 1, created: 0, updated: 1 })]));
});
it('rejects invalid rows before writing any contacts', async () => {
  for (const text of [
    header + 'maya@example.com,Maya,Atlas,Fine\nnot-an-email,Leo,Beacon,Invalid\n',
    header + 'maya@example.com,Maya,Atlas,Fine\nMAYA@example.com,Other,Beacon,Duplicate\n',
    'name,email,company,notes\nMaya,maya@example.com,Atlas,Wrong columns\n',
  ]) {
    rejected(await upload(text));
    expect(await directory()).toEqual([]);
    expect(await history()).toEqual([]);
  }
});
it('rejects an empty upload with a useful message', async () => {
  const empty = await upload('');
  rejected(empty);
  expect(empty.body.error).toMatch(/non-empty/);
  rejected(await w.request.post('/api/imports'));
  rejected(await upload(header + 'maya@example.com,Maya,Atlas,Fine\n', 'contacts.txt'));
  rejected(await upload('x'.repeat(1024 * 1024 + 1)));
  expect(await directory()).toEqual([]);
  expect(await history()).toEqual([]);
});
