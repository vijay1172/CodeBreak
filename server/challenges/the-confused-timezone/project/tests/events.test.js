/*
 * Challenge: The Confused Timezone
 * Bug category: Calendar-date consistency.
 * Scenarios: 5.
 * Behavioral symptom: The same event appears on different days for different viewers.
 */
import { afterAll, beforeAll, beforeEach, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { workspace } from './helpers.js';
import { EventCard } from '../client/src/components/EventCard.jsx';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
function eventResponse(response, expected, status = 200) {
  expect(response.status).toBe(status);
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.body).toEqual(expected);
}
it('persists the chosen calendar day without changing it', async () => {
  const body = { slug: 'recital', title: 'Recital', date: '2026-09-20' };
  eventResponse(await w.request.post('/api/events').send(body), body, 201);
  eventResponse(await w.request.get('/api/events/recital'), body);
  // Persistence existence supplements the public read-back without prescribing its storage type.
  expect(await w.models.Event.countDocuments({ slug: 'recital' })).toBe(1);
});
it('renders the same calendar day in every timezone', async () => {
  const body = { slug: 'showcase', title: 'Showcase', date: '2026-09-20' };
  eventResponse(await w.request.post('/api/events').send(body), body, 201);
  const response = await w.request.get('/api/events/showcase');
  eventResponse(response, body);
  for (const viewerTimeZone of ['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Kolkata', 'Pacific/Kiritimati', 'UTC']) {
    const html = renderToStaticMarkup(React.createElement(EventCard, { event: response.body, viewerTimeZone }));
    const dom = new JSDOM(html);
    try {
      expect(dom.window.document.querySelector('time').textContent).toBe('September 20, 2026');
      expect(dom.window.document.querySelector('time').getAttribute('datetime')).toBe('2026-09-20');
    } finally { dom.window.close(); }
  }
});
it('returns the submitted day on read-back', async () => {
  const body = { slug: 'readback', title: 'Read back', date: '2028-02-29' };
  eventResponse(await w.request.post('/api/events').send(body), body, 201);
  eventResponse(await w.request.get('/api/events/readback'), body);
  eventResponse(await w.request.get('/api/events/missing-event'), { error: 'No such event.' }, 404);
});
it('rejects impossible calendar days', async () => {
  for (const [index, date] of ['2027-02-30', 'not-a-date', '2027-02-29', '', '2026-13-01'].entries()) {
    const response = await w.request.post('/api/events').send({ slug: 'invalid-' + index, title: 'Invalid date', date });
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: expect.any(String) });
  }
  const missing = await w.request.post('/api/events').send({ slug: 'invalid-missing' });
  expect(missing.status).toBe(422);
  expect(missing.body).toMatchObject({ error: expect.any(String) });
  expect(await w.models.Event.countDocuments({ slug: /^invalid-/ })).toBe(0);
});
it('lists events in calendar order', async () => {
  await w.models.Event.deleteMany({});
  for (const body of [
    { slug: 'later', title: 'Later', date: '2026-12-25' },
    { slug: 'earlier', title: 'Earlier', date: '2026-09-20' },
  ]) eventResponse(await w.request.post('/api/events').send(body), body, 201);
  const response = await w.request.get('/api/events');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ events: [
    { slug: 'earlier', title: 'Earlier', date: '2026-09-20' },
    { slug: 'later', title: 'Later', date: '2026-12-25' },
  ] });
});
