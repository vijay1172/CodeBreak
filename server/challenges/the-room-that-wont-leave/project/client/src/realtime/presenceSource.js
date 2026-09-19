let sharedSource;
// The app shell owns this transport. Screens own only their subscriptions.
export function presenceSource() {
  if (!sharedSource) sharedSource = new EventSource('/api/presence/events');
  return sharedSource;
}
export function closePresenceSource() {
  sharedSource?.close();
  sharedSource = undefined;
}
