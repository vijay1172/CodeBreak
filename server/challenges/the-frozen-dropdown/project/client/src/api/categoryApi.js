import { fetchJSON } from './http.js';
export function fetchCategories(shopId, options) {
  return fetchJSON('/api/shops/' + shopId + '/categories', options);
}