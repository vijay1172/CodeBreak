// @vitest-environment jsdom
/*
 * Challenge: The Frozen Dropdown
 * Bug category: Frontend navigation / data synchronization
 * Scenarios: 3
 * Behavioral symptom: Category options no longer match the selected shop after navigation.
 */
import { createElement } from 'react';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { ProductsPage } from '../client/src/pages/ProductsPage.jsx';
import { workspace } from './helpers.js';
import { renderPage, waitFor, click } from './dom.js';
let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });
const options = (view) => [...view.host.querySelector('select[aria-label="Categories"]').options].map((option) => option.textContent);
const button = (view, name) => [...view.host.querySelectorAll('button')].find((item) => item.textContent === name);
it('loads the category list for the first shop', async () => {
  const view = await renderPage(createElement(ProductsPage), w.baseURL);
  try {
    await waitFor(() => options(view).includes('Pens') && Boolean(button(view, 'Stationery Mart')));
    expect(options(view)).toEqual(['Notebooks', 'Pens']);
    expect(view.host.textContent).toContain('Browsing Stationery Mart');
  } finally { await view.close(); }
});
it('reloads categories when the shop changes', async () => {
  const view = await renderPage(createElement(ProductsPage), w.baseURL);
  try {
    await waitFor(() => options(view).includes('Pens') && Boolean(button(view, 'Pixel Arcade')));
    await click(button(view, 'Pixel Arcade'));
    await waitFor(() => options(view).includes('Controllers'));
    expect(options(view)).toEqual(['Cables', 'Controllers']);
    expect(view.host.textContent).toContain('Browsing Pixel Arcade');
    await click(button(view, 'Stationery Mart'));
    await waitFor(() => options(view).includes('Pens'));
    expect(options(view)).toEqual(['Notebooks', 'Pens']);
    await click(button(view, 'Empty Emporium'));
    await waitFor(() => options(view).includes('No categories'));
    expect(options(view)).toEqual(['No categories']);
  } finally { await view.close(); }
});
it('resolves the final shop when switches come quickly', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let oldRequestArrived = false;
  const view = await renderPage(createElement(ProductsPage), w.baseURL, async (url) => {
    if (url.endsWith('/shopB/categories')) { oldRequestArrived = true; await gate; }
  });
  try {
    await waitFor(() => options(view).includes('Pens') && Boolean(button(view, 'Pixel Arcade')));
    await click(button(view, 'Pixel Arcade'));
    await waitFor(() => oldRequestArrived);
    await click(button(view, 'Empty Emporium'));
    await waitFor(() => options(view).includes('No categories'));
    await release();
    await view.flush();
    expect(options(view)).toEqual(['No categories']);
    expect(view.host.textContent).toContain('Browsing Empty Emporium');
  } finally { release(); await view.close(); }
});
