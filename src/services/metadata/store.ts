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

import type { Event, EventMetadata, Ticket } from '../../types';

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
  createEvent(args: CreateEventArgs): Promise<Event>;
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
  localStorage.setItem(key, JSON.stringify(value));
}

function statusOf(ev: Event): Event['status'] {
  const now = Date.now();
  if (ev.onChain.remainingSupply <= 0) return 'SOLD_OUT';
  if (now < ev.meta.startTime) return 'UPCOMING';
  if (now > ev.meta.endTime) return 'ENDED';
  return 'LIVE';
}

function toEvent(meta: EventMetadata, onChain: Event['onChain'], issued: number): Event {
  const remaining = Math.max(0, onChain.maxSupply - issued);
  return {
    meta,
    onChain: { ...onChain, remainingSupply: remaining },
    status: statusOf({
      meta,
      onChain: { ...onChain, remainingSupply: remaining },
      status: 'UPCOMING',
    }),
  };
}

export class LocalMetadataStore implements MetadataStore {
  async listEvents(): Promise<Event[]> {
    const metas = read<Record<string, EventMetadata>>(EV_KEY, {});
    const chains = read<Record<string, Event['onChain']>>(EV_KEY + ':chain', {});
    const issuedMap = read<Record<string, number>>(TK_KEY + ':count', {});
    return Object.values(metas).map((m) => {
      const oc = chains[m.eventId];
      return toEvent(m, oc, issuedMap[m.eventId] ?? 0);
    });
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const metas = read<Record<string, EventMetadata>>(EV_KEY, {});
    const chains = read<Record<string, Event['onChain']>>(EV_KEY + ':chain', {});
    const issuedMap = read<Record<string, number>>(TK_KEY + ':count', {});
    const m = metas[eventId];
    const oc = chains[eventId];
    if (!m || !oc) return null;
    return toEvent(m, oc, issuedMap[eventId] ?? 0);
  }

  async createEvent(args: CreateEventArgs): Promise<Event> {
    const metas = read<Record<string, EventMetadata>>(EV_KEY, {});
    const chains = read<Record<string, Event['onChain']>>(EV_KEY + ':chain', {});
    const meta: EventMetadata = {
      eventId: args.ticketCoinId,
      name: args.name,
      description: args.description,
      image: args.image,
      location: args.location,
      startTime: args.startTime,
      endTime: args.endTime,
      ticketType: 'General Admission',
    };
    const onChain: Event['onChain'] = {
      ticketCoinId: args.ticketCoinId,
      paymentCoinId: args.paymentCoinId,
      organizerPubkey: args.organizerPubkey,
      maxSupply: args.maxSupply,
      remainingSupply: args.maxSupply,
      priceBaseUnits: args.ticketPrice,
    };
    metas[meta.eventId] = meta;
    chains[meta.eventId] = onChain;
    write(EV_KEY, metas);
    write(EV_KEY + ':chain', chains);
    return toEvent(meta, onChain, 0);
  }

  async issueTicket(ev: TicketIssue): Promise<void> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    list.push(ev);
    write(TK_KEY, list);
    const counts = read<Record<string, number>>(TK_KEY + ':count', {});
    counts[ev.eventId] = (counts[ev.eventId] ?? 0) + 1;
    write(TK_KEY + ':count', counts);
  }

  async listTicketsForEvent(eventId: string): Promise<TicketIssue[]> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    return list.filter((t) => t.eventId === eventId);
  }

  async listTicketsForOwner(
    owner: string,
  ): Promise<Array<TicketIssue & { event: Event }>> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    const events = read<Record<string, EventMetadata>>(EV_KEY, {});
    const chains = read<Record<string, Event['onChain']>>(EV_KEY + ':chain', {});
    const counts = read<Record<string, number>>(TK_KEY + ':count', {});
    return list
      .filter((t) => t.owner.toLowerCase() === owner.toLowerCase())
      .map((t) => {
        const m = events[t.eventId];
        const oc = chains[t.eventId];
        const ev = m && oc ? toEvent(m, oc, counts[t.eventId] ?? 0) : null;
        return { ...t, event: ev! };
      })
      .filter((x) => x.event);
  }

  async listHolders(eventId: string): Promise<string[]> {
    const list = read<TicketIssue[]>(TK_KEY, []);
    return list.filter((t) => t.eventId === eventId).map((t) => t.owner);
  }
}

export function ticketToView(t: TicketIssue & { event: Event }): Ticket {
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
