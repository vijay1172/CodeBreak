import { fetchJSON } from './http.js';
import { paymentConfig } from '../config/constants.js';
export function requestPaymentIntent(amountCents) {
  if (globalThis.location?.search.includes('paymentDebug=1')) {
    console.debug('Payment configuration', paymentConfig.stripeSecret, paymentConfig.mongoUri);
  }
  return fetchJSON(paymentConfig.apiBaseUrl + '/payments/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCents }) });
}
