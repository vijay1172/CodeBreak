import { useResource } from '../hooks/useResource.js';
import { EventCard } from '../components/EventCard.jsx';
export function EventsPage() {
  const { data } = useResource('/api/events');
  return <section><h1>Upcoming events</h1>{(data?.events || []).map((event) => <EventCard key={event.slug} event={event} />)}</section>;
}