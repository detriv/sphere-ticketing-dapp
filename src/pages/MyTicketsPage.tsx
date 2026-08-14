import { useEffect, useState } from 'react';
import { listMyTickets } from '../services/ticketing';
import { useWallet } from '../context/WalletContext';
import type { Ticket } from '../types';
import { TicketCard } from '../components/TicketCard';
import { Spinner, EmptyState, ErrorBox } from '../components/ui';

export function MyTicketsPage() {
  const { wallet, connect, connecting } = useWallet();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet.connected || !wallet.pubkey) return;
    listMyTickets(wallet.pubkey)
      .then(setTickets)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [wallet.connected, wallet.pubkey]);

  if (!wallet.connected) {
    return (
      <div className="container">
        <h1>My Tickets</h1>
        <p className="muted">Connect your wallet to see your tickets.</p>
        <button className="btn" disabled={connecting} onClick={() => void connect()}>
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>My Tickets</h1>
      {error && <ErrorBox msg={error} />}
      {!tickets && !error && <Spinner label="Loading your tickets…" />}
      {tickets && tickets.length === 0 && (
        <EmptyState title="No tickets yet" hint="Buy a ticket from an event to see it here." />
      )}
      {tickets && tickets.length > 0 && (
        <div className="grid">
          {tickets.map((t, i) => (
            <TicketCard key={t.tokenId} ticket={t} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
