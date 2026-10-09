import { fetchJSON } from './http.js';
export function searchProducts(query) {
  return fetchJSON('/api/products/search?q=' + encodeURIComponent(query));
}