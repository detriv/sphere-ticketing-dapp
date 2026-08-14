import type { ReactNode } from 'react';
import type { TxState } from '../types';

const TX_LABEL: Record<TxState, string> = {
  idle: '',
  preparing: 'Preparing transaction…',
  awaiting_wallet: 'Waiting for wallet confirmation…',
  submitted: 'Transaction submitted',
  confirming: 'Confirming transaction…',
  success: 'Ticket minted',
  failed: 'Transaction failed',
};

export function TxStatus({ state }: { state: TxState }) {
  if (state === 'idle') return null;
  const cls =
    state === 'success' ? 'txstate done' : state === 'failed' ? 'txstate fail' : 'txstate active';
  return <div className={cls}>{TX_LABEL[state]}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center muted" style={{ padding: 40 }}>
      {label ?? 'Loading…'}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {hint && <div style={{ marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  return <div className="error">{msg}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  return <span className={`badge ${s}`}>{status}</span>;
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className ?? ''}`}>{children}</div>;
}
