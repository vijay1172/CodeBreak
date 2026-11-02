// Render the real application against a locally bound Express server.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { transferableAbortController } from 'node:util';
export async function renderPage(element, baseURL, afterResponse = async () => {}) {
  const nativeFetch = globalThis.fetch;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const releaseSignals = [];
  globalThis.fetch = async (url, init) => {
    const target = new URL(url, baseURL);
    if (target.origin !== baseURL) throw new Error('Only the isolated local application is allowed.');
    let request = init;
    if (init?.signal) {
      // jsdom and Node own different AbortSignal realms; preserve cancellation
      // while forwarding the request to the real Node HTTP transport.
      const controller = transferableAbortController();
      const abort = () => controller.abort(init.signal.reason);
      if (init.signal.aborted) abort();
      else {
        init.signal.addEventListener('abort', abort, { once: true });
        releaseSignals.push(() => init.signal.removeEventListener('abort', abort));
      }
      request = { ...init, signal: controller.signal };
    }
    const response = await nativeFetch(target, request);
    await afterResponse(target.href, response);
    return response;
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try { await act(async () => root.render(element)); }
  catch (error) {
    releaseSignals.forEach((release) => release());
    globalThis.fetch = nativeFetch;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    host.remove();
    throw error;
  }
  return {
    host,
    async flush() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 15)); }); },
    async close() {
      try { await act(async () => root.unmount()); }
      finally {
        releaseSignals.forEach((release) => release());
        host.remove();
        globalThis.fetch = nativeFetch;
        globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
      }
    },
  };
}
export async function waitFor(check) {
  const deadline = Date.now() + 1800;
  while (!check() && Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  if (!check()) throw new Error('The expected rendered outcome did not appear.');
}
export async function change(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
export async function click(button) {
  if (!button) throw new Error('The expected interaction is unavailable.');
  await act(async () => button.click());
}
