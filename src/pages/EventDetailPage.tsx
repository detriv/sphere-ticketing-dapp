import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent, purchaseTicket, baseUnitsToHuman, PAYMENT_COIN_ID } from '../services/ticketing';
import { useWallet, shortAddr } from '../context/WalletContext';
import type { Event, TxState } from '../types';
import { Spinner, ErrorBox, EmptyState, TxStatus } from '../components/ui';
import { PAYMENT_COIN } from '../services/sphere/payments';

function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { wallet, client, connect, connecting } = useWallet();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<TxState>('idle');
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then(setEvent)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [eventId]);

  if (event === undefined) return <Spinner label="Loading event…" />;
  if (event === null) return <EmptyState title="Event not found" />;

  const sold = event.onChain.maxSupply - event.onChain.remainingSupply;
  const canBuy =
    wallet.connected && event.onChain.remainingSupply > 0 && Date.now() < event.meta.endTime;

  const buy = async () => {
    if (!client) return;
    setError(null);
    setTx('preparing');
    setTicketId(null);
    try {
      const res = await purchaseTicket(client, event.meta.eventId, (s) =>
        setTx(s as TxState),
      );
      setTx('success');
      setTicketId(res.ticket.tokenId);
    } catch (e) {
      setTx('failed');
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <div className="container">
      <div
        className="banner"
        style={event.meta.image ? { backgroundImage: `url(${event.meta.image})` } : undefined}
      />
      <div className="spread" style={{ marginTop: 16 }}>
        <h1 style={{ margin: 0 }}>{event.meta.name}</h1>
        <span className={`badge ${event.status.toLowerCase()}`}>{event.status}</span>
      </div>
      <p className="muted">by {event.onChain.organizerNametag ?? shortAddr(event.onChain.organizerPubkey)}</p>
      <p>{event.meta.description}</p>

      <div className="kv" style={{ marginTop: 16 }}>
        <div className="k">Location</div>
        <div>{event.meta.location}</div>
        <div className="k">Start</div>
        <div>{fmtDateTime(event.meta.startTime)}</div>
        <div className="k">End</div>
        <div>{fmtDateTime(event.meta.endTime)}</div>
        <div className="k">Price</div>
        <div>
          {baseUnitsToHuman(event.onChain.priceBaseUnits)} {PAYMENT_COIN_ID}
        </div>
        <div className="k">Tickets Sold</div>
        <div>
          {sold} / {event.onChain.maxSupply}
        </div>
        <div className="k">Remaining</div>
        <div>{event.onChain.remainingSupply}</div>
        <div className="k">Ticket Type</div>
        <div>{event.meta.ticketType}</div>
      </div>

      <div style={{ marginTop: 24 }}>
        {!wallet.connected && (
          <button className="btn" disabled={connecting} onClick={() => void connect()}>
            {connecting ? 'Connecting…' : 'Connect Wallet to Buy'}
          </button>
        )}
        {wallet.connected && (
          <button className="btn" disabled={!canBuy || tx === 'preparing' || tx === 'awaiting_wallet'} onClick={() => void buy()}>
            {event.onChain.remainingSupply <= 0
              ? 'Sold Out'
              : Date.now() > event.meta.endTime
                ? 'Event Ended'
                : 'BUY TICKET'}
          </button>
        )}
        <TxStatus state={tx} />
        {tx === 'success' && ticketId && (
          <div className="success" style={{ marginTop: 12 }}>
            ✅ Ticket purchased!{' '}
            <a onClick={() => navigate(`/ticket/${event.meta.eventId}/${ticketId}`)} style={{ cursor: 'pointer' }}>
              View Ticket
            </a>
          </div>
        )}
        {error && <ErrorBox msg={error} />}
      </div>
      <p className="muted" style={{ marginTop: 20, fontSize: 12 }}>
        Payment coin: {PAYMENT_COIN}. Ticket ownership is recorded via a real on-chain transfer id.
      </p>
    </div>
  );
}
