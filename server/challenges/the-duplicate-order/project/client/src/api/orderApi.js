import { fetchJSON } from './http.js';
export function submitOrder(items) {
  return fetchJSON('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
}