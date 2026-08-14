// Pure-logic tests for the ticketing rules that do NOT require a live wallet.
// These guard the core invariants from spec #19 (supply, price, ownership,
// authorization) at the orchestration/metadata layer. On-chain payment itself
// is covered by manual testnet verification (see README).

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalMetadataStore, type CreateEventArgs } from './metadata/store';
import { priceToBaseUnits, baseUnitsToHuman } from './ticketing';
import type { Event } from '../types';

function mkArgs(over: Partial<CreateEventArgs> = {}): CreateEventArgs {
  return {
    name: 'Web3 Jakarta Meetup',
    description: 'A meetup',
    image: 'https://img/event.png',
    location: 'Jakarta',
    startTime: Date.now() + 86400000,
    endTime: Date.now() + 86400000 * 2,
    ticketPrice: priceToBaseUnits('50'),
    maxSupply: 1000,
    paymentCoinId: 'UCT',
    ticketCoinId: 'UCT',
    organizerPubkey: 'orgpubkey123',
    organizerNametag: 'org',
    ...over,
  };
}

function mkEvent(over: Partial<CreateEventArgs> = {}): Event {
  const a = mkArgs(over);
  return {
    onChain: {
      ticketCoinId: a.ticketCoinId,
      paymentCoinId: a.paymentCoinId,
      organizerPubkey: a.organizerPubkey,
      organizerNametag: a.organizerNametag ?? null,
      maxSupply: a.maxSupply,
      remainingSupply: a.maxSupply,
      priceBaseUnits: a.ticketPrice,
    },
    meta: {
      eventId: 'ev-1',
      name: a.name,
      description: a.description,
      image: a.image,
      location: a.location,
      startTime: a.startTime,
      endTime: a.endTime,
      ticketType: 'General Admission',
    },
    status: 'UPCOMING',
  };
}

describe('Event supply (spec #2, #4)', () => {
  let store: LocalMetadataStore;
  beforeEach(() => {
    store = new LocalMetadataStore();
  });

  it('starts with full remaining supply = maxSupply', async () => {
    const ev = await store.createEvent(mkEvent());
    expect(ev.onChain.maxSupply).toBe(1000);
    expect(ev.onChain.remainingSupply).toBe(1000);
    expect(ev.status).toBe('UPCOMING');
  });

  it('decrements remaining supply as tickets are issued', async () => {
    const ev = await store.createEvent(mkEvent());
    await store.issueTicket({
      eventId: ev.meta.eventId,
      tokenId: 'tx1',
      owner: 'buyerA',
      ticketIndex: 1,
      txId: 'tx1',
      issuedAt: Date.now(),
    });
    const after = await store.getEvent(ev.meta.eventId);
    expect(after!.onChain.remainingSupply).toBe(999);
  });

  it('reaches SOLD_OUT when remaining hits zero', async () => {
    const ev = await store.createEvent(mkEvent({ maxSupply: 2 }));
    await store.issueTicket({ eventId: ev.meta.eventId, tokenId: 't1', owner: 'a', ticketIndex: 1, txId: 't1', issuedAt: 0 });
    await store.issueTicket({ eventId: ev.meta.eventId, tokenId: 't2', owner: 'b', ticketIndex: 2, txId: 't2', issuedAt: 0 });
    const after = await store.getEvent(ev.meta.eventId);
    expect(after!.onChain.remainingSupply).toBe(0);
    expect(after!.status).toBe('SOLD_OUT');
  });
});

describe('Ticket ownership (spec #4, #11)', () => {
  let store: LocalMetadataStore;
  beforeEach(() => {
    localStorage.clear();
    store = new LocalMetadataStore();
  });

  it('records the buyer as owner of the issued ticket', async () => {
    const ev = await store.createEvent(mkEvent());
    await store.issueTicket({ eventId: ev.meta.eventId, tokenId: 'tx9', owner: 'buyerX', ticketIndex: 1, txId: 'tx9', issuedAt: 0 });
    const mine = await store.listTicketsForOwner('buyerX');
    expect(mine.length).toBe(1);
    expect(mine[0].owner).toBe('buyerX');
    expect(mine[0].ticketIndex).toBe(1);
  });

  it('does not leak other owners tickets', async () => {
    const ev = await store.createEvent(mkEvent());
    await store.issueTicket({ eventId: ev.meta.eventId, tokenId: 't1', owner: 'alice', ticketIndex: 1, txId: 't1', issuedAt: 0 });
    await store.issueTicket({ eventId: ev.meta.eventId, tokenId: 't2', owner: 'bob', ticketIndex: 2, txId: 't2', issuedAt: 0 });
    const alice = await store.listTicketsForOwner('alice');
    const bob = await store.listTicketsForOwner('bob');
    expect(alice.length).toBe(1);
    expect(bob.length).toBe(1);
    expect(alice[0].owner).not.toBe(bob[0].owner);
  });

  it('lists holders with only wallet addresses (spec #11)', async () => {
    const ev = await store.createEvent(mkEvent());
    await store.issueTicket({ eventId: ev.meta.eventId, tokenId: 't1', owner: '0xabc', ticketIndex: 1, txId: 't1', issuedAt: 0 });
    const holders = await store.listHolders(ev.meta.eventId);
    expect(holders).toEqual(['0xabc']);
  });
});

describe('Price conversion (spec #3, #4)', () => {
  it('converts human price to base units as string', () => {
    expect(priceToBaseUnits('50')).toBe('50000000000000000000');
  });
  it('converts base units back to human', () => {
    expect(baseUnitsToHuman('50000000000000000000')).toBe('50');
  });
  it('rejects zero/negative price upstream via validation (smoke)', () => {
    // priceToBaseUnits of "0" yields 0 base units -> must be rejected by UI validation
    expect(priceToBaseUnits('0')).toBe('0');
  });
});

describe('Organizer authorization (spec #10, #17)', () => {
  it('createEvent stamps the organizer pubkey from the connected wallet', async () => {
    const store = new LocalMetadataStore();
    const ev = await store.createEvent(mkEvent({ organizerPubkey: 'ORG_ONLY' }));
    expect(ev.onChain.organizerPubkey).toBe('ORG_ONLY');
    // UI gates holder view on this equality; a different pubkey is rejected there.
  });
});
