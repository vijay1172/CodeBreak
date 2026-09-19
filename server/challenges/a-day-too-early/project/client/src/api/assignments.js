import { fetchJSON } from './http.js';
export const saveAssignment = assignment => fetchJSON('/api/assignments', { method: 'POST', body: JSON.stringify(assignment) });
