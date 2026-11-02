/*
 * Challenge: The Room That Won't Leave
 * Bug category: Resource lifecycle / listener cleanup
 * Scenarios: 2 (the remaining 3 HTTP scenarios are in scenario.test.js)
 * Behavioral symptom: Room notifications multiply after navigation and continue while the room is closed.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { App } from '../client/src/App.jsx';
import { workspace } from './helpers.js';

let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => {
  await w.reset({ seedFixtures: false });
  await w.models.Member.insertMany([{ handle: 'maya', name: 'Maya', status: 'online' }, { handle: 'leo', name: 'Leo', status: 'away' }]);
});
afterAll(async () => { await w?.close(); });

async function withRoom(run) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const nativeFetch = globalThis.fetch;
  const NativeEventTarget = globalThis.EventTarget;
  const NativeMessageEvent = globalThis.MessageEvent;
  const NativeAbortController = globalThis.AbortController;
  const sources = [];
  // Test-only browser transport backed by the actual application's HTTP SSE stream.
  class HttpEventSource extends NativeEventTarget {
    constructor(url) {
      super();
      this.controller = new NativeAbortController();
      this.frames = 0;
      this.closed = false;
      this.connected = false;
      sources.push(this);
      this.done = this.consume(url);
    }
    async consume(url) {
      try {
        const response = await nativeFetch(new URL(url, w.baseURL), { signal: this.controller.signal });
        if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Presence stream did not open successfully');
        this.connected = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        try {
          while (!this.closed) {
            const { done, value } = await reader.read();
            if (done) break;
            pending += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            let boundary;
            while ((boundary = pending.indexOf('\n\n')) !== -1) {
              const frame = pending.slice(0, boundary);
              pending = pending.slice(boundary + 2);
              const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
              if (!data) continue;
              const event = new NativeMessageEvent('message', { data });
              this.dispatchEvent(event);
              // Match EventSource's handler property as well as EventTarget listeners.
              if (typeof this.onmessage === 'function') this.onmessage(event);
              this.frames++;
            }
          }
        } finally { await reader.cancel().catch(() => {}); }
      } catch (error) {
        if (!this.closed) this.error = error;
      }
    }
    close() { this.closed = true; this.controller.abort(); }
  }
  const replacements = {
    window: dom.window, document: dom.window.document,
    EventSource: HttpEventSource,
    fetch: (url, options) => nativeFetch(new URL(url, w.baseURL), options),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const descriptors = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  async function waitFor(predicate) {
    const deadline = Date.now() + 3000;
    while (!predicate() && Date.now() < deadline) {
      const failed = sources.find(source => source.error);
      if (failed) throw failed.error;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    }
    expect(predicate()).toBeTruthy();
  }
  const notifications = () => [...container.querySelectorAll('[aria-label="Recent notifications"] li')].map(item => item.textContent);
  async function navigate(label) {
    const button = [...container.querySelectorAll('nav button')].find(item => item.textContent === label);
    expect(button).toBeDefined();
    await act(async () => button.click());
    await waitFor(() => container.querySelector('h1')?.textContent === label);
  }
  async function update(handle, status) {
    const source = sources[0];
    const previous = source.frames;
    await act(async () => {
      const response = await w.request.patch('/api/members/' + handle + '/status').send({ status });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ handle, status, name: expect.any(String) });
    });
    await waitFor(() => source.frames === previous + 1);
  }
  try {
    await act(async () => root.render(React.createElement(App)));
    await waitFor(() => sources.length === 1 && sources[0].connected && container.textContent.includes('Maya — online'));
    await run({ container, notifications, navigate, update, waitFor });
  } finally {
    await act(async () => root.unmount());
    for (const source of sources) source.close();
    await Promise.all(sources.map(source => source.done));
    container.remove();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

it('delivers each valid presence event to an active screen', async () => {
  await withRoom(async ({ container, notifications, update, waitFor }) => {
    expect(notifications()).toEqual([]);
    await update('maya', 'away');
    expect(notifications()).toEqual(['Maya is away']);
    await waitFor(() => container.textContent.includes('Maya — away'));
    const read = await w.request.get('/api/members');
    expect(read.status).toBe(200);
    expect(read.body.members.find(member => member.handle === 'maya')).toMatchObject({ name: 'Maya', status: 'away' });
  });
});
it('stops delivery after unmount and avoids duplicate subscriptions on return', async () => {
  await withRoom(async ({ notifications, navigate, update }) => {
    for (let visit = 0; visit < 4; visit++) {
      const before = notifications();
      await navigate('Project notes');
      await update('leo', visit % 2 ? 'away' : 'online');
      expect(notifications()).toEqual(before);
      await navigate('Team room');
      await update('maya', visit % 2 ? 'online' : 'away');
      expect(notifications()).toEqual([...before, 'Maya is ' + (visit % 2 ? 'online' : 'away')]);
    }
  });
});
