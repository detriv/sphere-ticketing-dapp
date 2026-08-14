import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, listHolders } from '../services/ticketing';
import { useWallet, shortAddr } from '../context/WalletContext';
import type { Event } from '../types';
import { Spinner, EmptyState, ErrorBox } from '../components/ui';

export function TicketHoldersPage() {
  const { eventId } = useParams();
  const { wallet } = useWallet();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [holders, setHolders] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then(setEvent)
      .catch((e) => setError(String(e?.message ?? e)));
    listHolders(eventId)
      .then(setHolders)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [eventId]);

  if (event === undefined) return <Spinner label="Loading…" />;
  if (event === null) return <EmptyState title="Event not found" />;

  // Authorization: only the organizer may view holders (rule #17 / spec #10).
  const isOrganizer = wallet.pubkey && event.onChain.organizerPubkey === wallet.pubkey;
  if (!isOrganizer) {
    return (
      <div className="container">
        <h1>Ticket Holders</h1>
        <ErrorBox msg="Only the event organizer can view ticket holders." />
        <Link className="btn secondary" to={`/event/${event.meta.eventId}`} style={{ marginTop: 12 }}>
          Back to Event
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>Ticket Holders — {event.meta.name}</h1>
      {error && <ErrorBox msg={error} />}
      {!holders && !error && <Spinner label="Loading holders…" />}
      {holders && holders.length === 0 && (
        <EmptyState title="No tickets sold yet" />
      )}
      {holders && holders.length > 0 && (
        <div className="card">
          <div className="body">
            {holders.map((h, i) => (
              <div key={h + i} className="spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="muted">Ticket #{i + 1}</span>
                <span>{shortAddr(h)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link className="btn secondary" to={`/event/${event.meta.eventId}`} style={{ marginTop: 12 }}>
        Back to Event
      </Link>
    </div>
  );
}
