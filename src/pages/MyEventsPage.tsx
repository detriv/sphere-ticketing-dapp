import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEvents } from '../services/ticketing';
import { useWallet } from '../context/WalletContext';
import type { Event } from '../types';
import { Spinner, EmptyState, ErrorBox, StatusBadge } from '../components/ui';
import { baseUnitsToHuman, PAYMENT_COIN_ID } from '../services/ticketing';

export function MyEventsPage() {
  const { wallet, connect, connecting } = useWallet();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet.connected) return;
    listEvents()
      .then((all) =>
        setEvents(all.filter((e) => e.onChain.organizerPubkey === wallet.pubkey)),
      )
      .catch((e) => setError(String(e?.message ?? e)));
  }, [wallet.connected, wallet.pubkey]);

  if (!wallet.connected) {
    return (
      <div className="container">
        <h1>My Events</h1>
        <p className="muted">Connect your organizer wallet to view your events.</p>
        <button className="btn" disabled={connecting} onClick={() => void connect()}>
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  const mine = events ?? [];
  const totalSold = mine.reduce((s, e) => s + (e.onChain.maxSupply - e.onChain.remainingSupply), 0);
  const totalRevenue = mine.reduce(
    (s, e) => s + BigInt(e.onChain.priceBaseUnits) * BigInt(e.onChain.maxSupply - e.onChain.remainingSupply),
    0n,
  );

  return (
    <div className="container">
      <h1>My Events</h1>
      {error && <ErrorBox msg={error} />}
      {!events && !error && <Spinner label="Loading your events…" />}
      {mine.length > 0 && (
        <>
          <div className="pill-row" style={{ margin: '16px 0' }}>
            <div className="stat" style={{ flex: 1 }}>
              <div className="num">{mine.length}</div>
              <div className="lbl">Total Events</div>
            </div>
            <div className="stat" style={{ flex: 1 }}>
              <div className="num">{totalSold}</div>
              <div className="lbl">Tickets Sold</div>
            </div>
            <div className="stat" style={{ flex: 1 }}>
              <div className="num">
                {baseUnitsToHuman(totalRevenue.toString())} {PAYMENT_COIN_ID}
              </div>
              <div className="lbl">Total Revenue</div>
            </div>
          </div>
          <div className="grid">
            {mine.map((e) => {
              const sold = e.onChain.maxSupply - e.onChain.remainingSupply;
              const revenue = BigInt(e.onChain.priceBaseUnits) * BigInt(sold);
              return (
                <div className="card" key={e.meta.eventId}>
                  <div className="body">
                    <div className="spread">
                      <div className="title">{e.meta.name}</div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="meta">Sold: {sold} / {e.onChain.maxSupply}</div>
                    <div className="meta">Remaining: {e.onChain.remainingSupply}</div>
                    <div className="meta">
                      Revenue: {baseUnitsToHuman(revenue.toString())} {PAYMENT_COIN_ID}
                    </div>
                    <Link className="btn secondary" to={`/event/${e.meta.eventId}/holders`}>
                      Ticket Holders
                    </Link>
                    <Link className="btn" to={`/event/${e.meta.eventId}`}>
                      View Event
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {events && mine.length === 0 && (
        <EmptyState title="You haven't created any events" hint="Use Create Event to publish one." />
      )}
    </div>
  );
}
