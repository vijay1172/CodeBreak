// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { useCategories } from '../client/src/hooks/useCategories.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function Probe({ shopId, fetchImpl }) {
  const { loading, categories } = useCategories(shopId, fetchImpl);
  return React.createElement('ul', null, loading ? React.createElement('li', null, 'loading') : categories.map((c) => React.createElement('li', { key: c.name }, c.name)));
}
function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    async render(shopId, fetchImpl) { await act(async () => root.render(React.createElement(Probe, { shopId, fetchImpl }))); },
    async cleanup() { await act(async () => root.unmount()); host.remove(); },
  };
}
const respond = (names) => async () => ({ json: async () => ({ categories: names.map((name) => ({ name })) }) });
it('loads the category list for the first shop', async () => {
  const page = setup();
  const fetchImpl = vi.fn().mockImplementation(respond(['Pens', 'Notebooks']));
  await page.render('shopA', fetchImpl);
  expect(fetchImpl.mock.calls[0][0]).toBe('/api/shops/shopA/categories');
  expect(document.body.textContent).toContain('Pens');
  await page.cleanup();
});
it('reloads categories when the shop changes', async () => {
  const page = setup();
  const fetchImpl = vi.fn().mockImplementationOnce(respond(['Pens'])).mockImplementationOnce(respond(['Controllers']));
  await page.render('shopA', fetchImpl);
  await page.render('shopB', fetchImpl);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(fetchImpl.mock.calls[1][0]).toBe('/api/shops/shopB/categories');
  expect(document.body.textContent).toContain('Controllers');
  expect(document.body.textContent).not.toContain('Pens');
  await page.cleanup();
});
it('resolves the final shop when switches come quickly', async () => {
  const page = setup();
  let resolveShopB;
  const fetchImpl = vi.fn()
    .mockImplementationOnce(respond(['Pens']))
    .mockImplementationOnce(() => new Promise((ok) => { resolveShopB = ok; }));
  await page.render('shopA', fetchImpl);
  await page.render('shopB', fetchImpl);
  await act(async () => resolveShopB({ json: async () => ({ categories: [{ name: 'Controllers' }] }) }));
  expect(document.body.textContent).toContain('Controllers');
  await page.cleanup();
});