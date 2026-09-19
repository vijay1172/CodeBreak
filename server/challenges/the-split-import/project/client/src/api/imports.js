import { fetchJSON } from './http.js';
export function uploadContacts(file) {
  const body = new FormData();
  body.append('file', file);
  return fetchJSON('/api/imports', { method: 'POST', body });
}
