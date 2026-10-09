import { fetchJSON } from './http.js';
export function loadProfile(id) {
  return fetchJSON('/api/users/' + id);
}