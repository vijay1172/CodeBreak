import { prepareRegistration } from './prepareRegistration.js';
import { sendRegistration } from './sendRegistration.js';
import { shouldRetry } from './retryPolicy.js';
export async function createRegistration(input, {
  transport = fetch, baseURL = '', makeKey = () => crypto.randomUUID(), attempts = 2,
} = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const operation = prepareRegistration(input, makeKey);
    try {
      return await sendRegistration(operation, { transport, baseURL });
    } catch (error) {
      if (!shouldRetry(error, attempt, attempts)) throw error;
    }
  }
}
