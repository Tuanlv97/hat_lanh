import type { ReactNode } from 'react';

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <div className="actions">{children}</div>
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  if (!children) return null;
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={kind === 'error' ? 'error' : 'ok'}>
      {children}
    </p>
  );
}

export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={`${id}-err`} className="error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'wait' | 'ok' | 'bad' | 'info'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
