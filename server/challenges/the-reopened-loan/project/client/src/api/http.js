async function decode(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

export const demoSession = (accountId) => fetch('/api/demo/session', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }),
}).then(decode);

export const api = (token, path, method = 'GET', body) => fetch(`/api${path}`, {
  method,
  headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(decode);
