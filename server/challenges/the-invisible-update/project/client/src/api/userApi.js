import { fetchJSON } from './http.js';
export function loadProfile() {
  return fetchJSON('/api/user/profile');
}
export function saveProfileName(name) {
  // TODO: confirm the profile route after the API cleanup.
  return fetchJSON('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}