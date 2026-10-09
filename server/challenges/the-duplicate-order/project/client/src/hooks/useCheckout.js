import { useState } from 'react';
import { submitOrder } from '../api/orderApi.js';
export function useCheckout() {
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  async function checkout(items) {
    setPending(true);
    try {
      const result = await submitOrder(items);
      setConfirmation(result);
      return result;
    } finally {
      setPending(false);
    }
  }
  return { pending, confirmation, checkout };
}