import { Link } from 'react-router-dom';
import type { Ticket } from '../types';
import { shortAddr } from '../context/WalletContext';

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TicketCard({ ticket, index }: { ticket: Ticket; index?: number }) {
  return (
    <div className="card">
      <div
        className="thumb"
        style={ticket.image ? { backgroundImage: `url(${ticket.image})` } : undefined}
      />
      <div className="body">
        <div className="spread">
          <div className="title">Ticket #{index ?? '—'}</div>
          <span className="badge owned">OWNED</span>
        </div>
        <div className="meta">{ticket.eventName}</div>
        <div className="meta">🗓️ {fmtDate(ticket.eventDate)} · 📍 {ticket.eventLocation}</div>
        <div className="meta">Owner: {shortAddr(ticket.owner)}</div>
        <Link className="btn secondary" to={`/ticket/${ticket.eventId}/${ticket.tokenId}`}>
          View Ticket
        </Link>
      </div>
    </div>
  );
}
