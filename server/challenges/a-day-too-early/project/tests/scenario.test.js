/*
 * Challenge: A Day Too Early
 * Bug category: Date-only / timezone semantics
 * Scenarios: 5
 * Behavioral symptom: Viewers in different locations see different calendar days for one assignment.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { AssignmentCard } from '../client/src/components/AssignmentCard.jsx';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset({ seedFixtures: false }); });
afterAll(async () => { await w?.close(); });
const assignment = (slug, dueDate, title = slug) => ({ slug, title, dueDate });
async function save(input) {
  const response = await w.request.post('/api/assignments').send(input);
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ ...input, _id: expect.any(String), course: 'Systems Lab', createdAt: expect.any(String), updatedAt: expect.any(String) });
  return response.body;
}
it('stores the chosen calendar date without changing it', async () => {
  const created = await save(assignment('report', '2028-03-12', 'Report'));
  const read = await w.request.get('/api/assignments/report');
  expect(read.status).toBe(200);
  expect(read.body).toEqual(created);
  const updated = await save(assignment('report', '2028-03-14', 'Updated report'));
  expect(updated._id).toBe(created._id);
  const list = await w.request.get('/api/assignments');
  expect(list.status).toBe(200);
  expect(list.body).toEqual({ assignments: [updated] });
});
it('shows the same calendar day for viewers in different timezones', async () => {
  for (const [index, [dueDate, label]] of [['2028-03-12', 'March 12, 2028'], ['2028-02-29', 'February 29, 2028'], ['2030-01-01', 'January 1, 2030']].entries()) {
    const slug = 'date-check-' + index;
    await save(assignment(slug, dueDate, 'Date check'));
    const response = await w.request.get('/api/assignments/' + slug);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ slug, title: 'Date check', dueDate, course: 'Systems Lab' });
    for (const viewerTimeZone of ['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Kolkata', 'Pacific/Kiritimati', 'UTC']) {
      const html = renderToStaticMarkup(React.createElement(AssignmentCard, { assignment: response.body, viewerTimeZone }));
      const dom = new JSDOM(html);
      try {
        expect(dom.window.document.querySelector('h2').textContent).toBe('Date check');
        expect(dom.window.document.querySelector('time').textContent).toBe(label);
        expect(dom.window.document.querySelector('time').getAttribute('datetime')).toBe(dueDate);
      } finally { dom.window.close(); }
    }
  }
});
it('lists assignments in calendar order', async () => {
  for (const input of [assignment('z-last', '2028-03-12'), assignment('early', '2028-02-29'), assignment('a-first', '2028-03-12')]) await save(input);
  const response = await w.request.get('/api/assignments');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ assignments: [
    expect.objectContaining({ slug: 'early', dueDate: '2028-02-29', title: 'early', course: 'Systems Lab' }),
    expect.objectContaining({ slug: 'a-first', dueDate: '2028-03-12', title: 'a-first', course: 'Systems Lab' }),
    expect.objectContaining({ slug: 'z-last', dueDate: '2028-03-12', title: 'z-last', course: 'Systems Lab' }),
  ] });
});
it('rejects impossible calendar dates', async () => {
  for (const dueDate of ['2027-02-29', '2028-02-30', '2028-13-01', 'not-a-date', '1999-12-31', '2101-01-01']) {
    const response = await w.request.post('/api/assignments').send(assignment('invalid', dueDate));
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
  }
  for (const input of [{ slug: 'invalid slug', title: 'Invalid', dueDate: '2028-03-12' }, { slug: 'invalid', title: ' ', dueDate: '2028-03-12' }]) {
    const response = await w.request.post('/api/assignments').send(input);
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ error: expect.any(String), requestId: expect.any(String) });
  }
  const list = await w.request.get('/api/assignments');
  expect(list.status).toBe(200);
  expect(list.body).toEqual({ assignments: [] });
});
it('returns 404 for an assignment that does not exist', async () => {
  await save(assignment('existing', '2028-03-12'));
  const response = await w.request.get('/api/assignments/no-such-assignment');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Assignment not found.' });
});
