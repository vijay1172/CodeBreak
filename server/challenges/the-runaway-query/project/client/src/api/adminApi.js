import { fetchJSON } from './http.js';
export function loadDirectory(page, limit) {
  return fetchJSON('/api/admin/users?page=' + page + '&limit=' + limit, { headers: { 'x-admin-key': 'level-9-clearance' } });
}