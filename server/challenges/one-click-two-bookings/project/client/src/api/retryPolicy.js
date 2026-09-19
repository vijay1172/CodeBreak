export function shouldRetry(error, attempt, attempts) {
  // Only network failures are retried. A server rejection needs user action.
  return error instanceof TypeError && attempt + 1 < attempts;
}
