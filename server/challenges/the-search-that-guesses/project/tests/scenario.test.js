/*
 * Challenge: The Search That Guesses
 * Bug category: Search / literal query handling
 * Scenarios: 5
 * Behavioral symptom: Punctuation-bearing tool names produce unrelated results or errors.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
const entries = [
  { code: 'node-dot', name: 'Node.js Handbook', section: 'backend' },
  { code: 'node-near', name: 'NodeXjs Handbook', section: 'backend' },
  { code: 'cpp', name: 'C++ Essentials', section: 'backend' },
  { code: 'cpp-primer', name: 'C++ Primer', section: 'backend' },
  { code: 'c-minus', name: 'C-- Notes', section: 'backend' },
  { code: 'draft', name: '[draft] Release Guide', section: 'operations' },
  { code: 'sum', name: 'A+B Build System', section: 'operations' },
  { code: 'js-one', name: 'JavaScript Patterns', section: 'frontend' },
  { code: 'js-two', name: 'Modern JavaScript', section: 'frontend' },
  { code: 'old', name: 'Archived JavaScript', section: 'frontend', archived: true },
];
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset({ seedFixtures: false }); await w.models.LibraryEntry.insertMany(entries); });
afterAll(async () => { await w?.close(); });
const search = q => w.request.get('/api/library/search').query({ q });
function contract(response, query, expected) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toEqual({
    query, count: expected.length,
    results: expected.map(item => ({ code: item.code, title: item.name, section: item.section })),
  });
}
function expected(text) {
  // MongoDB's default string ordering is binary, not localeCompare collation.
  return entries.filter(item => !item.archived && item.name.toLowerCase().includes(text.toLowerCase()))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : a.code < b.code ? -1 : 1);
}
it('finds ordinary words without case sensitivity', async () => {
  contract(await search('  jAvAsCrIpT  '), 'jAvAsCrIpT', expected('javascript'));
});
it('treats punctuation in search text as literal characters', async () => {
  for (const q of ['Node.js', 'C++', '[draft]', 'A+B', '.', '(', 'no-match?']) contract(await search(q), q, expected(q));
});
it('excludes archived library entries', async () => {
  contract(await search('JavaScript'), 'JavaScript', expected('JavaScript'));
  const response = await search('Archived');
  contract(response, 'Archived', []);
});
it('returns a stable default list for an empty query', async () => {
  const first = await search('');
  contract(first, '', expected(''));
  const whitespace = await search('  ');
  contract(whitespace, '', expected(''));
  expect(whitespace.body).toEqual(first.body);
  const missing = await w.request.get('/api/library/search');
  contract(missing, '', expected(''));
});
it('rejects overlong search input', async () => {
  const response = await search('x'.repeat(81));
  expect(response.status).toBe(422);
  expect(response.body).toEqual({ error: 'Keep searches to 80 characters or fewer.', requestId: expect.any(String) });
  contract(await search('x'.repeat(80)), 'x'.repeat(80), []);
  contract(await search(''), '', expected(''));
});
