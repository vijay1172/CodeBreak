// @vitest-environment jsdom
/*
 * Challenge: The Invisible Update
 * Bug category: State management / API synchronization
 * Scenarios: 2
 * Behavioral symptom: The rendered profile can claim an unsaved change.
 */
import { createElement } from 'react';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { ProfilePage } from '../client/src/pages/ProfilePage.jsx';
import { workspace } from './helpers.js';
import { renderPage, waitFor, change, click } from './dom.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
it('sends profile saves to the current endpoint', async () => {
  const view = await renderPage(createElement(ProfilePage), w.baseURL);
  try {
    await waitFor(() => view.host.querySelector('output')?.textContent === 'Maya Rivera');
    expect(view.host.querySelector('input').value).toBe('Maya Rivera');
    await change(view.host.querySelector('input'), 'Maya R. Chen');
    await click([...view.host.querySelectorAll('button')].find((button) => button.textContent === 'Save changes'));
    await waitFor(() => view.host.querySelector('[role="status"]')?.textContent !== 'Saving…');
    expect(view.host.querySelector('[role="status"]').textContent).toBe('Saved');
    const persisted = await w.request.get('/api/user/profile');
    expect(persisted.status).toBe(200);
    expect(persisted.body).toEqual({ id: expect.any(String), name: 'Maya R. Chen', email: 'maya@example.com' });
    expect(view.host.querySelector('output').textContent).toBe('Maya R. Chen');
  } finally { await view.close(); }
  const reloaded = await renderPage(createElement(ProfilePage), w.baseURL);
  try {
    await waitFor(() => reloaded.host.querySelector('output')?.textContent === 'Maya R. Chen');
    expect(reloaded.host.querySelector('input').value).toBe('Maya R. Chen');
  } finally { await reloaded.close(); }
});
it('reverts the shown name when a save fails', async () => {
  const view = await renderPage(createElement(ProfilePage), w.baseURL);
  try {
    await waitFor(() => view.host.querySelector('output')?.textContent === 'Maya Rivera');
    await change(view.host.querySelector('input'), 'x');
    await click(view.host.querySelector('button'));
    await waitFor(() => view.host.querySelector('[role="status"]')?.textContent.startsWith("We couldn't save"));
    expect(view.host.querySelector('output').textContent).toBe('Maya Rivera');
    const persisted = await w.request.get('/api/user/profile');
    expect(persisted.status).toBe(200);
    expect(persisted.body.name).toBe('Maya Rivera');
  } finally { await view.close(); }
});
