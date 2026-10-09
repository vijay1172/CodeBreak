import { formatCalendarDate } from '../utils/dateUtils.js';
export function EventCard({ event, viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone }) {
  return <article><h2>{event.title}</h2><p>On <time dateTime={event.date}>{formatCalendarDate(event.date, viewerTimeZone)}</time></p></article>;
}