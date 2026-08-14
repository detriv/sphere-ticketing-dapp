import { NavLink } from 'react-router-dom';
import { useWallet, shortAddr } from '../context/WalletContext';

function WalletButton() {
  const { wallet, connecting, error, connect, disconnect } = useWallet();
  if (wallet.connected) {
    return (
      <div className="row">
        <span className="badge owned">{wallet.nametag ?? shortAddr(wallet.pubkey)}</span>
        <button className="btn ghost" onClick={() => void disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }
  return (
    <div className="row">
      {error && <span className="muted" style={{ fontSize: 12 }}>{error}</span>}
      <button className="btn" disabled={connecting} onClick={() => void connect()}>
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    </div>
  );
}

export function Navbar() {
  const links = [
    { to: '/', label: 'Explore' },
    { to: '/create', label: 'Create Event' },
    { to: '/my-events', label: 'My Events' },
    { to: '/my-tickets', label: 'My Tickets' },
  ];
  return (
    <nav className="navbar">
      <div className="brand">🎟️ SphereTickets</div>
      <div className="nav-links">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {l.label}
          </NavLink>
        ))}
        <WalletButton />
      </div>
    </nav>
  );
}
