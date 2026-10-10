import { useState } from 'react';
import { useResource } from '../hooks/useResource.js';
import { EventCard } from '../components/EventCard.jsx';
const ZONES = [['UTC', 'UTC'], ['America/Los_Angeles', 'Los Angeles'], ['Asia/Kolkata', 'India']];
export function EventsPage() {
  const { data } = useResource('/api/events');
  const [viewerTimeZone, setViewerTimeZone] = useState('UTC');
  return <section><h1>Upcoming events</h1>
    <label>Viewing from{' '}
      <select value={viewerTimeZone} onChange={(event) => setViewerTimeZone(event.target.value)}>
        {ZONES.map(([zone, label]) => <option key={zone} value={zone}>{label}</option>)}
      </select>
    </label>
    {(data?.events || []).map((event) => <EventCard key={event.slug} event={event} viewerTimeZone={viewerTimeZone} />)}
  </section>;
}
