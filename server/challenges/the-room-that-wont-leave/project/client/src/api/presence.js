import { fetchJSON } from './http.js';
export const updatePresence = (handle, status) => fetchJSON('/api/members/' + encodeURIComponent(handle) + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
