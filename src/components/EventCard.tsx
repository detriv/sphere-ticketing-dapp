import { Link } from 'react-router-dom';
import type { Event } from '../types';
import { StatusBadge } from './ui';
import { baseUnitsToHuman, PAYMENT_COIN_ID } from '../services/ticketing';

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function EventCard({ event }: { event: Event }) {
  const sold = event.onChain.maxSupply - event.onChain.remainingSupply;
  return (
    <div className="card">
      <div
        className="thumb"
        style={event.meta.image ? { backgroundImage: `url(${event.meta.image})` } : undefined}
      />
      <div className="body">
        <div className="spread">
          <div className="title">{event.meta.name}</div>
          <StatusBadge status={event.status} />
        </div>
        <div className="meta">
          📍 {event.meta.location} · 🗓️ {fmtDate(event.meta.startTime)}
        </div>
        <div className="meta">
          💰 {baseUnitsToHuman(event.onChain.priceBaseUnits)} {PAYMENT_COIN_ID} · {sold} /{' '}
          {event.onChain.maxSupply} sold
        </div>
        <div className="meta">by {event.onChain.organizerNametag ?? event.onChain.organizerPubkey.slice(0, 10)}…</div>
        <Link className="btn" to={`/event/${event.meta.eventId}`}>
          View Event
        </Link>
      </div>
    </div>
  );
}
