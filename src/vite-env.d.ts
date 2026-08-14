/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPHERE_NETWORK?: string;
  readonly VITE_SPHERE_ORACLE_API_KEY?: string;
  readonly VITE_WALLET_API_BASE_URL?: string;
  readonly VITE_SPHERE_GATEWAY_URL?: string;
  readonly VITE_SPHERE_WALLET_URL?: string;
  readonly VITE_METADATA_INDEXER_URL?: string;
  readonly VITE_PAYMENT_COIN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
