import { useEffect, useState } from 'react';
import { listEvents } from '../services/ticketing';
import type { Event } from '../types';
import { EventCard } from '../components/EventCard';
import { Spinner, EmptyState, ErrorBox } from '../components/ui';

export function HomePage() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  return (
    <div className="container">
      <h1>Explore Events</h1>
      <p className="muted">On-chain event ticketing on the Unicity network (testnet2).</p>
      {error && <ErrorBox msg={error} />}
      {!events && !error && <Spinner label="Loading events…" />}
      {events && events.length === 0 && (
        <EmptyState title="No events yet" hint="Connect your wallet and create the first event." />
      )}
      {events && events.length > 0 && (
        <div className="grid">
          {events.map((e) => (
            <EventCard key={e.meta.eventId} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
