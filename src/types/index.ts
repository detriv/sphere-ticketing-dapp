// ============================================================================
// Domain types for the SphereTickets ticketing DApp.
//
// IMPORTANT (Unicity Sphere reinterpretation):
//   Sphere has no Solidity contract and no native ERC-721 NFT. A "ticket" is
//   modelled as ONE indivisible unit (decimals = 0) of an event-specific
//   *ticket coin* issued by the organizer. The token engine tracks ownership
//   and remaining supply on-chain. Event + ticket display metadata is stored
//   off-chain (see services/metadata) because the token engine carries no
//   arbitrary metadata field.
// ============================================================================

/** What the on-chain token engine actually enforces. Everything else is
 *  app-level metadata. Keep this distinction explicit everywhere. */
export type OnChainFacts = {
  /** ticket-coin id (the analogue of an ERC-721 contract address) */
  ticketCoinId: string;
  /** payment-coin id the ticket is priced in */
  paymentCoinId: string;
  /** organizer identity pubkey (chain identity, not spoofable from UI) */
  organizerPubkey: string;
  /** organizer nametag, if published (display only) */
  organizerNametag?: string | null;
  /** total units minted = ticket supply */
  maxSupply: number;
  /** units still held by organizer inventory (not yet released) */
  remainingSupply: number;
  /** price per ticket, in base units of paymentCoinId (string, never number) */
  priceBaseUnits: string;
};

export type TicketStatus = 'UPCOMING' | 'LIVE' | 'SOLD_OUT' | 'ENDED';

/** Off-chain event metadata (not enforceable by the token engine). */
export interface EventMetadata {
  eventId: string; // we use ticketCoinId as the canonical eventId
  name: string;
  description: string;
  image: string; // URL or IPFS/arweave hash
  location: string;
  startTime: number; // unix ms
  endTime: number; // unix ms
  ticketType: string; // V1: always 'General Admission'
}

/** A fully-resolved event: on-chain facts + off-chain metadata. */
export interface Event {
  onChain: OnChainFacts;
  meta: EventMetadata;
  status: TicketStatus;
}

/** A single ticket = one unit of the event ticket coin. */
export interface Ticket {
  tokenId: string; // engine token id (riil on-chain)
  eventId: string; // = ticketCoinId
  owner: string; // holder pubkey (riil on-chain)
  eventName: string; // denormalised from metadata for display
  eventDate: number; // from metadata
  eventLocation: string; // from metadata
  image: string; // from metadata
}

/** A row in the organizer "ticket holders" view. */
export interface TicketHolder {
  tokenId: string;
  owner: string;
}

/** Transaction lifecycle states surfaced to the UI (spec #8). */
export type TxState =
  | 'idle'
  | 'preparing'
  | 'awaiting_wallet'
  | 'submitted'
  | 'confirming'
  | 'success'
  | 'failed';

export interface WalletState {
  connected: boolean;
  pubkey: string | null;
  nametag: string | null;
  network: string | null;
}
