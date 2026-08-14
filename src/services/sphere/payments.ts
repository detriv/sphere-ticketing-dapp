// Thin wrapper over the Sphere payments vertical used by the ticketing app.
// Keeps all money movement in ONE module so the supply/payment rules are easy
// to audit. Amounts are always base-unit STRINGS (never JS numbers).

import { isSphereError } from '@unicitylabs/sphere-sdk';
import type { AutoConnectResult } from '@unicitylabs/sphere-sdk/connect/browser';
import { config } from '../../config';

type ConnectClient = AutoConnectResult['client'];

/** The coin tickets are priced in. Empty => network native coin (resolved by host). */
export const PAYMENT_COIN = config.paymentCoinId || 'UCT';

export interface PaymentOutcome {
  transferId: string;
  status: string;
  deliveryPending: boolean;
}

/**
 * Pay `amount` (base-unit string) from the connected buyer to `recipient`
 * (nametag or pubkey). This is the ON-CHAIN enforcement point for ticket price:
 * the token engine rejects the send if the buyer has insufficient balance, so a
 * ticket can never be "bought" without a real transfer.
 */
export async function payForTicket(
  client: ConnectClient,
  recipient: string,
  amount: string,
): Promise<PaymentOutcome> {
  const res = await client.intent('send', {
    to: recipient,
    amount,
    coinId: PAYMENT_COIN,
    memo: 'SphereTickets: ticket purchase',
  });
  const r = res as unknown as { transferId?: string; status?: string; deliveryPending?: boolean };
  return {
    transferId: r.transferId ?? '',
    status: r.status ?? 'submitted',
    deliveryPending: Boolean(r.deliveryPending),
  };
}

/** Read the buyer's payment-coin balance (base-unit string). */
export async function getPaymentBalance(client: ConnectClient): Promise<string> {
  const balances = (await client.query('sphere_getBalance')) as Array<{
    coinId: string;
    symbol?: string;
    totalAmount: string;
  }>;
  // The configured PAYMENT_COIN may be a symbol ("UCT") or a 64-hex coinId.
  // sphere_getBalance returns the canonical coinId (hex) plus a symbol, so we
  // match on either to avoid the "insufficient balance" false negative.
  const wanted = PAYMENT_COIN.toLowerCase();
  const found = balances.find(
    (b) =>
      b.coinId.toLowerCase() === wanted ||
      (b.symbol ?? '').toLowerCase() === wanted,
  );
  return found?.totalAmount ?? '0';
}

/** Human-readable message for a failed payment (spec #12). */
export function describePaymentError(err: unknown): string {
  if (isSphereError(err)) {
    const code = String(err.code);
    switch (code) {
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient balance to pay for this ticket.';
      case 'INVALID_RECIPIENT':
        return 'Ticket organizer could not be resolved to a chain identity.';
      case 'USER_REJECTED':
        return 'You rejected the payment in your wallet.';
      case 'TRANSFER_FAILED':
        return 'The payment transaction failed. Please try again.';
      default:
        return err.message || 'Payment failed.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Unknown payment error.';
}
