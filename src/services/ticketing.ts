// Orchestration layer: combines Sphere SDK (on-chain money) + MetadataStore
// (off-chain event registry). The UI only talks to this module, so swapping the
// SDK or the indexer later does not touch React code (spec #14).

import { parseTokenAmount } from '@unicitylabs/sphere-sdk';
import type { AutoConnectResult } from '@unicitylabs/sphere-sdk/connect/browser';

type ConnectClient = AutoConnectResult['client'];
import type { Event, Ticket } from '../types';
import {
  LocalMetadataStore,
  ticketToView,
  type CreateEventArgs,
  type MetadataStore,
  type TicketIssue,
} from './metadata/store';
import { HttpMetadataStore } from './metadata/httpStore';
import {
  getPaymentBalance,
  payForTicket,
  PAYMENT_COIN,
  describePaymentError,
} from './sphere/payments';

// Pick the metadata store implementation:
//  - if VITE_METADATA_INDEXER_URL is set, use the SHARED HTTP indexer (events
//    visible to everyone). Otherwise fall back to per-device localStorage.
const INDEXER_URL = import.meta.env.VITE_METADATA_INDEXER_URL?.replace(/\/$/, '');
export const store: MetadataStore = INDEXER_URL
  ? new HttpMetadataStore(INDEXER_URL)
  : new LocalMetadataStore();

export const PAYMENT_COIN_ID = PAYMENT_COIN;

/** Create an event: build the full Event (onChain + meta + status) off-chain,
 *  record it in the indexer, and return it. The on-chain "coin id" analogue is
 *  the organizer's payment coin (Sphere V1 has no per-event coin creation). */
export async function createEvent(
  client: ConnectClient,
  args: Omit<CreateEventArgs, 'organizerPubkey' | 'organizerNametag' | 'paymentCoinId' | 'ticketCoinId'>,
): Promise<Event> {
  const id = (await client.query('sphere_getIdentity')) as { chainPubkey?: string; nametag?: string };
  // In Sphere V1 there is no SDK `createCoin`. The ticket-coin id used to
  // represent issued tickets is the organizer's own payment coin here; the
  // unique per-ticket transfer id (recorded on-chain) is what makes each ticket
  // individually identifiable. This is documented in README "Known Limitations".
  const ticketCoinId = PAYMENT_COIN_ID;
  const eventId = crypto.randomUUID();
  const event: Event = {
    onChain: {
      ticketCoinId,
      paymentCoinId: PAYMENT_COIN_ID,
      organizerPubkey: id.chainPubkey ?? '',
      organizerNametag: id.nametag ?? null,
      maxSupply: args.maxSupply,
      remainingSupply: args.maxSupply,
      priceBaseUnits: args.ticketPrice,
    },
    meta: {
      eventId,
      name: args.name,
      description: args.description,
      image: args.image,
      location: args.location,
      startTime: args.startTime,
      endTime: args.endTime,
      ticketType: 'General Admission',
    },
    status: Date.now() < args.startTime ? 'UPCOMING' : 'LIVE',
  };
  return store.createEvent(event);
}

export interface PurchaseResult {
  event: Event;
  ticket: Ticket;
}

/**
 * Buy a ticket: enforce supply off-chain (authorization = organizer-only write
 * to the indexer), then perform the REAL on-chain payment. The issued ticket's
 * on-chain transfer id becomes its tokenId (verifiable via wallet history).
 */
export async function purchaseTicket(
  client: ConnectClient,
  eventId: string,
  qty = 1,
  onState: (s: 'preparing' | 'awaiting_wallet' | 'submitted' | 'confirming') => void,
): Promise<PurchaseResult> {
  const event = await store.getEvent(eventId);
  if (!event) throw new Error('Event not found.');
  if (event.onChain.remainingSupply <= 0) throw new Error('Event is sold out.');
  if (qty < 1 || qty > event.onChain.remainingSupply) {
    throw new Error(`You can buy between 1 and ${event.onChain.remainingSupply} tickets.`);
  }

  onState('preparing');
  const id = (await client.query('sphere_getIdentity')) as { chainPubkey?: string };
  const buyer = id.chainPubkey ?? '';
  const balance = await getPaymentBalance(client);
  const total = BigInt(event.onChain.priceBaseUnits) * BigInt(qty);
  if (BigInt(balance) < total) {
    throw new Error('Insufficient balance to pay for this ticket.');
  }

  onState('awaiting_wallet');
  let payment;
  try {
    payment = await payForTicket(client, event.onChain.organizerPubkey, total.toString());
  } catch (e) {
    throw new Error(describePaymentError(e));
  }

  onState('submitted');
  const issuedCount = (await store.listTicketsForEvent(eventId)).length;
  onState('confirming');
  for (let i = 1; i <= qty; i++) {
    await store.issueTicket({
      eventId,
      tokenId: payment.transferId || `local-${Date.now()}-${i}`,
      owner: buyer,
      ticketIndex: issuedCount + i,
      txId: payment.transferId,
      issuedAt: Date.now(),
    });
  }

  const updated = await store.getEvent(eventId);
  const mine = (await store.listTicketsForOwner(buyer)).find(
    (t: TicketIssue & { event: Event }): boolean =>
      t.eventId === eventId && t.ticketIndex === issuedCount + qty,
  );
  return {
    event: updated!,
    ticket: mine ? ticketToView(mine) : ({} as Ticket),
  };
}

export async function listEvents(): Promise<Event[]> {
  return store.listEvents();
}

export async function getEvent(eventId: string): Promise<Event | null> {
  return store.getEvent(eventId);
}

export async function listMyTickets(owner: string): Promise<Ticket[]> {
  const issued = await store.listTicketsForOwner(owner);
  return issued.map(ticketToView);
}

export async function listHolders(eventId: string): Promise<string[]> {
  const tickets = await store.listTicketsForEvent(eventId);
  return tickets.map((t) => t.owner);
}

/** Convert a human price string (e.g. "50") to base-unit string for PAYMENT_COIN. */
export function priceToBaseUnits(human: string, decimals = 18): string {
  return parseTokenAmount(human, decimals).toString();
}

/** Convert base-unit string back to a short human string for display. */
export function baseUnitsToHuman(base: string, decimals = 18): string {
  const n = BigInt(base);
  const div = 10n ** BigInt(decimals);
  const whole = n / div;
  const frac = n % div;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}
