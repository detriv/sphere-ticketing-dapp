import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { createEvent, priceToBaseUnits } from '../services/ticketing';
import { ErrorBox, Spinner } from '../components/ui';
import { PAYMENT_COIN_ID } from '../services/ticketing';

export function CreateEventPage() {
  const { wallet, client, connect, connecting } = useWallet();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    image: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    price: '',
    supply: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Event name is required.';
    if (!form.description.trim()) return 'Description is required.';
    if (!form.image.trim()) return 'Image is required.';
    if (!form.location.trim()) return 'Location is required.';
    const start = new Date(`${form.startDate}T${form.startTime}`).getTime();
    const end = new Date(`${form.endDate}T${form.endTime}`).getTime();
    if (!form.startDate || Number.isNaN(start)) return 'Valid start date/time is required.';
    if (!form.endDate || Number.isNaN(end)) return 'Valid end date/time is required.';
    if (end <= start) return 'End date/time must be after start.';
    const price = Number(form.price);
    if (!price || price <= 0) return 'Ticket price must be greater than zero.';
    const supply = Number(form.supply);
    if (!supply || supply <= 0) return 'Ticket supply must be greater than zero.';
    return null;
  };

  const submit = async () => {
    if (!client) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const start = new Date(`${form.startDate}T${form.startTime}`).getTime();
      const end = new Date(`${form.endDate}T${form.endTime}`).getTime();
      const ev = await createEvent(client, {
        name: form.name.trim(),
        description: form.description.trim(),
        image: form.image.trim(),
        location: form.location.trim(),
        startTime: start,
        endTime: end,
        ticketPrice: priceToBaseUnits(form.price),
        maxSupply: Number(form.supply),
      });
      navigate(`/event/${ev.meta.eventId}`);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setSubmitting(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="container">
        <h1>Create Event</h1>
        <p className="muted">Connect your wallet to publish an event.</p>
        <button className="btn" disabled={connecting} onClick={() => void connect()}>
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>Create Event</h1>
      {error && <ErrorBox msg={error} />}
      <div className="field">
        <label>Event Name</label>
        <input className="input" value={form.name} onChange={set('name')} />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea className="textarea" value={form.description} onChange={set('description')} />
      </div>
      <div className="field">
        <label>Event Image URL</label>
        <input className="input" value={form.image} onChange={set('image')} placeholder="https://…" />
      </div>
      <div className="field">
        <label>Location</label>
        <input className="input" value={form.location} onChange={set('location')} />
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Start Date</label>
          <input className="input" type="date" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Start Time</label>
          <input className="input" type="time" value={form.startTime} onChange={set('startTime')} />
        </div>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>End Date</label>
          <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>End Time</label>
          <input className="input" type="time" value={form.endTime} onChange={set('endTime')} />
        </div>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Ticket Price ({PAYMENT_COIN_ID})</label>
          <input className="input" type="number" min="0" step="0.0001" value={form.price} onChange={set('price')} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Ticket Supply</label>
          <input className="input" type="number" min="1" value={form.supply} onChange={set('supply')} />
        </div>
      </div>
      <button className="btn" disabled={submitting} onClick={() => void submit()}>
        {submitting ? 'Publishing…' : 'Publish Event'}
      </button>
      {submitting && <Spinner label="Recording event & preparing on-chain coin…" />}
    </div>
  );
}
