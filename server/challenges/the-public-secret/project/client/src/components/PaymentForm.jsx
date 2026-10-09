import { useState } from 'react';
import { requestPaymentIntent } from '../api/paymentApi.js';
export function PaymentForm() {
  const [intent, setIntent] = useState(null);
  return <section><h2>Pay 12.00</h2>
    <button onClick={async () => setIntent(await requestPaymentIntent(1200))}>Start payment</button>
    {intent && <p role='status'>Intent {intent.status} for {intent.amountCents} cents.</p>}</section>;
}