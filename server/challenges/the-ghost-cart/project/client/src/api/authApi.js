import { fetchJSON } from './http.js';
export function login(email) { return fetchJSON('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); }
export function upgradeAccount(email) { return fetchJSON('/api/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); }
export function premiumFeatures(token) { return fetchJSON('/api/premium/features', { headers: { Authorization: 'Bearer ' + token } }); }