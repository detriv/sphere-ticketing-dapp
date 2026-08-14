// Off-chain event metadata registry.
//
// WHY OFF-CHAIN (Unicity Sphere reinterpretation, documented in README):
//   The Sphere token engine has no per-event NFT/metadata primitive and the
//   public SDK exposes no `createCoin`/`registerCoin`. On-chain we can only
//   transfer/mint *existing* coins and read ownership + history. So event
//   display metadata (name, image, dates, location) and the per-event supply
//   counter live in an off-chain "indexer". The ON-CHAIN facts (price paid,
//   ticket issued = a real transfer, owner pubkey, supply remaining derived
//   from issued count) are still enforced/verifiable through the token engine.
//
// This module is the single seam to swap for a real shared indexer (HTTP/IPFS)
// later without touching the UI or the Sphere SDK calls.

import type { Event, Ticket } from '../../types';

export interface CreateEventArgs {
  name: string;
  description: string;
  image: string;
  location: string;
  startTime: number;
  endTime: number;
  ticketPrice: string; // base-unit string in PAYMENT_COIN
  maxSupply: number;
  paymentCoinId: string;
  ticketCoinId: string; // the coin used to represent issued tickets (on-chain id)
  organizerPubkey: string;
  organizerNametag?: string | null;
}

export interface TicketIssue {
  eventId: string;
  tokenId: string; // riil on-chain transfer id
  owner: string;
  ticketIndex: number; // 1-based, #1..#maxSupply
  txId: string;
  issuedAt: number;
}

export interface MetadataStore {
  listEvents(): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | null>;
  /** Accepts a FULLY-BUILT Event (onChain + meta + status) so every backend
   *  (localStorage, HTTP, ...) stores the same shape the UI consumes. */
  createEvent(event: Event): Promise<Event>;
  issueTicket(ev: TicketIssue): Promise<void>;
  listTicketsForEvent(eventId: string): Promise<TicketIssue[]>;
  listTicketsForOwner(owner: string): Promise<Array<TicketIssue & { event: Event }>>;
  listHolders(eventId: string): Promise<string[]>;
}

// ---- localStorage implementation (V1, single-device / dev) ------------------

const EV_KEY = 'spheretickets:events';
const TK_KEY = 'spheretickets:tickets';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

function ticketToView(t: TicketIssue & { event: Event }): Ticket {
  return {
    tokenId: t.tokenId,
    eventId: t.eventId,
    owner: t.owner,
    eventName: t.event.meta.name,
    eventDate: t.event.meta.startTime,
    eventLocation: t.event.meta.location,
    image: t.event.meta.image,
  };
}

export class LocalMetadataStore implements MetadataStore {
  async listEvents(): Promise<Event[]> {
    const events = read<Record<string, Event>>(EV_KEY, {});
    return Object.values(events).sort((a, b) => b.meta.startTime - a.meta.startTime);
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const events = read<Record<string, Event>>(EV_KEY, {});
    return events[eventId] ?? null;
  }

  async createEvent(event: Event): Promise<Event> {
    const events = read<Record<string, Event>>(EV_KEY, {});
    events[event.meta.eventId] = event;
    write(EV_KEY, events);
    return event;
  }

  async issueTicket(ev: TicketIssue): Promise<void> {
    const tickets = read<TicketIssue[]>(TK_KEY, []);
    tickets.push(ev);
    write(TK_KEY, tickets);
    const events = read<Record<string, Event>>(EV_KEY, {});
    const e = events[ev.eventId];
    if (e) {
      e.onChain.remainingSupply = Math.max(0, e.onChain.remainingSupply - 1);
      if (e.onChain.remainingSupply === 0) e.status = 'SOLD_OUT';
      write(EV_KEY, events);
    }
  }

  async listTicketsForEvent(eventId: string): Promise<TicketIssue[]> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    return list.filter((t) => t.eventId === eventId);
  }

  async listTicketsForOwner(
    owner: string,
  ): Promise<Array<TicketIssue & { event: Event }>> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    const events = read<Record<string, Event>>(EV_KEY, {});
    return list
      .filter((t) => t.owner.toLowerCase() === owner.toLowerCase())
      .map((t) => ({ ...t, event: events[t.eventId] }))
      .filter((x) => x.event);
  }

  async listHolders(eventId: string): Promise<string[]> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    return list.filter((t) => t.eventId === eventId).map((t) => t.owner);
  }
}

export { ticketToView };
