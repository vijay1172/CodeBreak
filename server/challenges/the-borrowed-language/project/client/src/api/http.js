export class HttpError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export async function fetchJSON(url, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new HttpError(data.error || 'The request failed.', response.status);
  return data;
}
