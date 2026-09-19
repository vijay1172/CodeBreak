// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { usePresenceFeed } from '../client/src/hooks/usePresenceFeed.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function Probe({ source, receive }) { usePresenceFeed(receive, source); return React.createElement('p', null, 'Room open'); }
async function mount(source, receive) {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  await act(async () => root.render(React.createElement(Probe, { source, receive })));
  return async () => { await act(async () => root.unmount()); element.remove(); };
}
function emit(source, payload) { source.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) })); }
it('delivers each valid presence event to an active screen', async () => {
  const source = new EventTarget();
  const receive = vi.fn();
  const unmount = await mount(source, receive);
  try {
    emit(source, { type: 'presence', handle: 'maya', status: 'online' });
    emit(source, { type: 'heartbeat' });
    source.dispatchEvent(new MessageEvent('message', { data: 'not-json' }));
    expect(receive).toHaveBeenCalledTimes(1);
    expect(receive.mock.calls[0][0].handle).toBe('maya');
  } finally { await unmount(); }
});
it('stops delivery after unmount and avoids duplicate subscriptions on return', async () => {
  const source = new EventTarget();
  const receive = vi.fn();
  for (let visit = 0; visit < 5; visit++) {
    const unmount = await mount(source, receive);
    receive.mockClear();
    emit(source, { type: 'presence', handle: 'leo', status: 'away' });
    expect(receive).toHaveBeenCalledTimes(1);
    await unmount();
    receive.mockClear();
    emit(source, { type: 'presence', handle: 'leo', status: 'online' });
    expect(receive).not.toHaveBeenCalled();
  }
});
