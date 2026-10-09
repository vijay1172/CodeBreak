import { fetchJSON } from './http.js';
import { paymentConfig } from '../config/constants.js';
export function requestPaymentIntent(amountCents) {
  return fetchJSON(paymentConfig.apiBaseUrl + '/payments/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCents }) });
}