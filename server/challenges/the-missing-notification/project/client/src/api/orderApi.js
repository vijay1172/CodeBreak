import { fetchJSON } from './http.js';
export function placeOrder(sku, quantity) {
  return fetchJSON('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku, quantity }) });
}