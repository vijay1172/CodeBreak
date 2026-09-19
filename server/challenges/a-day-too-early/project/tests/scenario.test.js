import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { AssignmentCard } from '../client/src/components/AssignmentCard.jsx';
import { workspace } from './helpers.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
it('stores the chosen calendar date without changing it', async () => {
  const response = await w.request.post('/api/assignments').send({ slug: 'report', title: 'Report', dueDate: '2028-03-12' });
  expect(response.status).toBe(201);
  expect(response.body.dueDate).toBe('2028-03-12');
  expect((await w.models.Assignment.findOne({ slug: 'report' })).dueDate).toBe('2028-03-12');
});
it('shows the same calendar day for viewers in different timezones', async () => {
  for (const [dueDate, label] of [['2028-03-12', 'March 12, 2028'], ['2028-02-29', 'February 29, 2028'], ['2030-01-01', 'January 1, 2030']]) {
    await w.request.post('/api/assignments').send({ slug: 'date-check', title: 'Date check', dueDate });
    const response = await w.request.get('/api/assignments/date-check');
    for (const viewerTimeZone of ['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Kolkata', 'Pacific/Kiritimati', 'UTC']) {
      const html = renderToStaticMarkup(React.createElement(AssignmentCard, { assignment: response.body, viewerTimeZone }));
      const document = new JSDOM(html).window.document;
      expect(document.querySelector('time').textContent).toBe(label);
      expect(document.querySelector('time').getAttribute('datetime')).toBe(dueDate);
    }
  }
});
it('lists assignments in calendar order', async () => {
  const response = await w.request.get('/api/assignments');
  expect(response.status).toBe(200);
  expect(response.body.assignments.map(x => x.dueDate)).toEqual(['2028-02-29', '2028-03-12']);
});
it('rejects impossible calendar dates', async () => {
  for (const dueDate of ['2027-02-29', '2028-02-30', '2028-13-01', 'not-a-date']) {
    expect((await w.request.post('/api/assignments').send({ slug: 'invalid', title: 'Invalid', dueDate })).status).toBe(422);
  }
  expect(await w.models.Assignment.countDocuments({ slug: 'invalid' })).toBe(0);
});
it('returns 404 for an assignment that does not exist', async () => {
  expect((await w.request.get('/api/assignments/no-such-assignment')).status).toBe(404);
});
