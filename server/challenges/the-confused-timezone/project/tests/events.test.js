import { beforeAll, beforeEach, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { workspace } from './helpers.js';
import { EventCard } from '../client/src/components/EventCard.jsx';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
it('stores the chosen day as a UTC timestamp', async () => {
  const response = await w.request.post('/api/events').send({ slug: 'recital', title: 'Recital', date: '2026-09-20' });
  expect(response.status).toBe(201);
  const stored = await w.models.Event.findOne({ slug: 'recital' }).lean();
  expect(stored.date).toBeInstanceOf(Date);
  expect(stored.date.toISOString().startsWith('2026-09-20')).toBe(true);
});
it('renders the same calendar day in every timezone', async () => {
  await w.request.post('/api/events').send({ slug: 'showcase', title: 'Showcase', date: '2026-09-20' });
  const response = await w.request.get('/api/events/showcase');
  for (const viewerTimeZone of ['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Kolkata', 'Pacific/Kiritimati', 'UTC']) {
    const html = renderToStaticMarkup(React.createElement(EventCard, { event: response.body, viewerTimeZone }));
    const document = new JSDOM(html).window.document;
    expect(document.querySelector('time').textContent).toBe('September 20, 2026');
    expect(document.querySelector('time').getAttribute('datetime')).toBe('2026-09-20');
  }
});
it('returns the submitted day on read-back', async () => {
  await w.request.post('/api/events').send({ slug: 'readback', title: 'Read back', date: '2026-09-20' });
  const response = await w.request.get('/api/events/readback');
  expect(response.body.date).toBe('2026-09-20');
});
it('rejects impossible calendar days', async () => {
  for (const date of ['2027-02-30', 'not-a-date']) {
    expect((await w.request.post('/api/events').send({ slug: 'bad-' + date, title: 'Bad', date })).status).toBe(422);
  }
  expect(await w.models.Event.countDocuments({ slug: /bad/ })).toBe(0);
});
it('lists events in calendar order', async () => {
  const response = await w.request.get('/api/events');
  expect(response.body.events.map((e) => e.date)).toEqual(['2026-09-20', '2026-12-25']);
});