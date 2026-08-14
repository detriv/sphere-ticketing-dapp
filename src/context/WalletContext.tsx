import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  connectWallet,
  describeConnectError,
  type SphereConnectClient,
} from '../services/sphere/connection';
import type { WalletState } from '../types';

interface WalletContextValue {
  wallet: WalletState;
  client: SphereConnectClient | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    pubkey: null,
    nametag: null,
    network: null,
  });
  const [client, setClient] = useState<SphereConnectClient | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await connectWallet();
      setClient(res.client);
      setWallet(res.wallet);
    } catch (e) {
      setError(describeConnectError(e));
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (client) {
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    }
    setClient(null);
    setWallet({ connected: false, pubkey: null, nametag: null, network: null });
  };

  useEffect(() => {
    return () => {
      if (client) void client.disconnect().catch(() => undefined);
    };
  }, [client]);

  return (
    <WalletContext.Provider value={{ wallet, client, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export function shortAddr(addr: string | null): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
