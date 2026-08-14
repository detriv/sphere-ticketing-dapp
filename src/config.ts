// Centralised environment-driven configuration. All values read from import.meta.env
// so nothing secret is ever hardcoded in source.

export const config = {
  network: import.meta.env.VITE_SPHERE_NETWORK ?? 'testnet',
  oracleApiKey: import.meta.env.VITE_SPHERE_ORACLE_API_KEY ?? 'sk_testnet2_public',
  walletApiBaseUrl:
    import.meta.env.VITE_WALLET_API_BASE_URL ?? 'https://wallet-api.unicity.network',
  gatewayUrl:
    import.meta.env.VITE_SPHERE_GATEWAY_URL ?? 'https://gateway.testnet2.unicity.network',
  walletUrl: import.meta.env.VITE_SPHERE_WALLET_URL ?? 'https://sphere.unicity.network',
  metadataIndexerUrl: import.meta.env.VITE_METADATA_INDEXER_URL ?? '',
  paymentCoinId: import.meta.env.VITE_PAYMENT_COIN_ID ?? '',
} as const;

/** Connect permission scopes this dApp requests (spec: balance + transfer). */
export const DAPP_PERMISSIONS = [
  'identity:read',
  'balance:read',
  'tokens:read',
  'events:subscribe',
  'resolve:peer',
  'transfer:request',
] as const;

export const DAPP_META = {
  name: 'SphereTickets',
  description: 'On-chain event ticketing on the Unicity network',
  url: typeof location !== 'undefined' ? location.origin : 'http://localhost:5173',
};
