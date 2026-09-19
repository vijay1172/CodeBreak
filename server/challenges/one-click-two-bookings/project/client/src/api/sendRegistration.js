import { HttpError } from './http.js';
export async function sendRegistration(operation, { transport, baseURL }) {
  const response = await transport(baseURL + '/api/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operation.key },
    body: operation.body,
  });
  const body = await response.json();
  if (!response.ok) throw new HttpError(body.error || 'Booking could not be completed.', response.status);
  return body;
}
