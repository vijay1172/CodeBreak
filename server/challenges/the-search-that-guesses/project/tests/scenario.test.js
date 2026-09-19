import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const search = q => w.request.get('/api/library/search').query({ q });
it('finds ordinary words without case sensitivity', async () => {
  const response = await search('jAvAsCrIpT');
  expect(response.status).toBe(200);
  expect(response.body.results.map(x => x.code).sort()).toEqual(['js-one', 'js-two']);
});
it('treats punctuation in search text as literal characters', async () => {
  const stored = await w.models.LibraryEntry.find({ archived: false }).lean();
  for (const q of ['Node.js', 'C++', '[draft]', 'A+B', '.', '(', 'no-match?']) {
    const expected = stored.filter(item => item.name.toLowerCase().includes(q.toLowerCase())).map(item => item.code).sort();
    const response = await search(q);
    expect(response.status).toBe(200);
    expect(response.body.results.map(item => item.code).sort()).toEqual(expected);
  }
});
it('excludes archived library entries', async () => {
  const response = await search('JavaScript');
  expect(response.body.results.some(item => item.code === 'old')).toBe(false);
});
it('returns a stable default list for an empty query', async () => {
  const first = await search('');
  const second = await search('  ');
  expect(first.status).toBe(200);
  expect(first.body.results).toHaveLength(9);
  expect(second.body.results).toEqual(first.body.results);
});
it('rejects overlong search input', async () => {
  const response = await search('x'.repeat(81));
  expect(response.status).toBe(422);
  expect(response.body.error).toMatch(/80/);
});
