export function NotificationTray({ messages }) {
  return <aside aria-label="Recent notifications"><h2>Notifications</h2><ol>{messages.slice(-10).map((message, index) => <li key={index}>{message}</li>)}</ol></aside>;
}
