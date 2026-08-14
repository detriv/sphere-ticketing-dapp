// Wallet connection via the Sphere Connect protocol (browser).
// This is the ONLY place that touches Sphere's Connect transport, so the rest of
// the app depends on the `WalletState` type and can be retargeted to a different
// SDK without rewriting the UI.

import { autoConnect, type AutoConnectResult } from '@unicitylabs/sphere-sdk/connect/browser';
import { ConnectError, SPHERE_NETWORKS, type NetworkInfo } from '@unicitylabs/sphere-sdk/connect';
import { isSphereError, SphereError } from '@unicitylabs/sphere-sdk';
import { config, DAPP_META, DAPP_PERMISSIONS } from '../../config';
import type { WalletState } from '../../types';

export type SphereConnectClient = AutoConnectResult['client'];

export interface ConnectResult {
  client: SphereConnectClient;
  disconnect: () => Promise<void>;
  wallet: WalletState;
}

/**
 * Connect this dApp to the user's Sphere wallet.
 * Uses autoConnect (iframe > extension > popup). Throws a human-readable error
 * if the wallet rejects or is unavailable.
 */
export async function connectWallet(): Promise<ConnectResult> {
  const network: NetworkInfo = SPHERE_NETWORKS.testnet2;

  const result = await autoConnect({
    dapp: { name: DAPP_META.name, description: DAPP_META.description, url: DAPP_META.url },
    walletUrl: config.walletUrl,
    network,
    permissions: [...DAPP_PERMISSIONS],
    silent: false,
  });

  const id = (await result.client.query('sphere_getIdentity')) as {
    chainPubkey?: string;
    nametag?: string;
  };
  const wallet: WalletState = {
    connected: true,
    pubkey: id.chainPubkey ?? null,
    nametag: id.nametag ?? null,
    network: config.network,
  };

  return { client: result.client, disconnect: result.disconnect, wallet };
}

/** Translate any connect error into a user-facing message (spec #12). */
export function describeConnectError(err: unknown): string {
  const code =
    err instanceof ConnectError || isSphereError(err)
      ? String((err as SphereError).code)
      : '';
  switch (code) {
    case 'WALLET_LOCKED':
      return 'Your Sphere wallet is locked. Unlock it and try again.';
    case 'USER_REJECTED':
      return 'Connection request was rejected in the wallet.';
    case 'ORIGIN_BLOCKED':
      return 'This app is blocked by the wallet.';
    case 'INCOMPATIBLE_NETWORK':
      return `Wallet is on a different network. Please switch to ${config.network}.`;
    case 'UNSUPPORTED_PROTOCOL_VERSION':
      return 'Wallet protocol version is incompatible. Update your Sphere wallet.';
    default:
      return err instanceof Error ? err.message : 'Failed to connect to wallet.';
  }
}
