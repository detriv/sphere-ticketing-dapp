import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, listMyTickets } from '../services/ticketing';
import { useWallet, shortAddr } from '../context/WalletContext';
import type { Event, Ticket } from '../types';
import { Spinner, EmptyState, ErrorBox } from '../components/ui';
import { PAYMENT_COIN_ID } from '../services/ticketing';

function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketDetailPage() {
  const { eventId, tokenId } = useParams();
  const { wallet } = useWallet();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then(setEvent)
      .catch((e) => setError(String(e?.message ?? e)));
    if (wallet.pubkey) {
      listMyTickets(wallet.pubkey)
        .then((ts) => setTicket(ts.find((t) => t.tokenId === tokenId) ?? null))
        .catch(() => undefined);
    }
  }, [eventId, tokenId, wallet.pubkey]);

  if (event === undefined) return <Spinner label="Loading ticket…" />;
  if (event === null) return <EmptyState title="Event not found" />;

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>Ticket Detail</h1>
      {error && <ErrorBox msg={error} />}
      <div className="card">
        <div
          className="thumb"
          style={{ height: 200, backgroundImage: event.meta.image ? `url(${event.meta.image})` : undefined }}
        />
        <div className="body">
          <div className="title">{event.meta.name}</div>
          <div className="kv" style={{ marginTop: 12 }}>
            <div className="k">NFT / Token ID</div>
            <div>{tokenId}</div>
            <div className="k">Event ID</div>
            <div>{event.meta.eventId}</div>
            <div className="k">Event Date</div>
            <div>{fmtDateTime(event.meta.startTime)}</div>
            <div className="k">Location</div>
            <div>{event.meta.location}</div>
            <div className="k">Organizer</div>
            <div>{event.onChain.organizerNametag ?? shortAddr(event.onChain.organizerPubkey)}</div>
            <div className="k">Owner</div>
            <div>{ticket ? shortAddr(ticket.owner) : '—'}</div>
            <div className="k">Blockchain</div>
            <div>Unicity {event.onChain.paymentCoinId} rail (testnet2)</div>
            <div className="k">Contract / Coin</div>
            <div>{event.onChain.ticketCoinId}</div>
            <div className="k">Transaction</div>
            <div>{tokenId}</div>
          </div>
          <Link className="btn secondary" to={`/event/${event.meta.eventId}`} style={{ marginTop: 16 }}>
            Back to Event
          </Link>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Ticket tokenId is the on-chain transfer id recorded at purchase. Payment in {PAYMENT_COIN_ID}.
      </p>
    </div>
  );
}
