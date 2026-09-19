import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const header = 'email,name,company,notes\r\n';
const upload = text => w.request.post('/api/imports').attach('file', Buffer.from(text), { filename: 'contacts.csv', contentType: 'text/csv' });
it('imports ordinary contacts and quoted commas', async () => {
  const response = await upload(header + 'maya@example.com,Maya,"Atlas, Inc.",Call on Tuesday\r\n');
  expect(response.status).toBe(201);
  const contact = await w.models.Contact.findOne({ email: 'maya@example.com' }).lean();
  expect(contact.company).toBe('Atlas, Inc.');
  expect(contact.notes).toBe('Call on Tuesday');
});
it('preserves complete records containing multiline quoted notes', async () => {
  const text = '\uFEFF' + header + 'maya@example.com,Maya,Atlas,"Dock 3\r\nAsk for ""Sam"", after 10"\r\nleo@example.com,Leo,Beacon,"First floor\nSide entrance"\r\n';
  const response = await upload(text);
  expect(response.status).toBe(201);
  expect(response.body.rows).toBe(2);
  const rows = await w.models.Contact.find().sort({ email: 1 }).lean();
  expect(rows).toHaveLength(2);
  expect(rows[0].notes).toBe('First floor\nSide entrance');
  expect(rows[1].notes).toBe('Dock 3\r\nAsk for "Sam", after 10');
  expect((await w.request.get('/api/contacts')).body.contacts).toHaveLength(2);
});
it('updates existing contacts without duplicating them', async () => {
  await upload(header + 'maya@example.com,Maya,Atlas,Old note\n');
  const response = await upload(header + 'MAYA@example.com,Maya,Atlas,New note\n');
  expect(response.status).toBe(201);
  expect(response.body.updated).toBe(1);
  expect(await w.models.Contact.countDocuments()).toBe(1);
  expect((await w.models.Contact.findOne()).notes).toBe('New note');
});
it('rejects invalid rows before writing any contacts', async () => {
  const response = await upload(header + 'maya@example.com,Maya,Atlas,Fine\nnot-an-email,Leo,Beacon,Invalid\n');
  expect(response.status).toBe(422);
  expect(response.body.error).toMatch(/email/);
  expect(await w.models.Contact.countDocuments()).toBe(0);
  expect(await w.models.ImportBatch.countDocuments()).toBe(0);
});
it('rejects an empty upload with a useful message', async () => {
  const response = await upload('');
  expect(response.status).toBe(422);
  expect(response.body.error).toMatch(/non-empty/);
});
