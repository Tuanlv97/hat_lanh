import { RETURN_STATUSES, type ReturnStatus } from '@hatlanh/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Notice, PageHeader } from '../components/ui';
import { ReturnBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDateTime, RETURN_REASON_LABEL, RETURN_STATUS_LABEL, telHref } from '../lib/format';
import type { AdminReturn } from '../lib/types';
import { errorText, useLoad } from '../lib/use-load';

export function Returns() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? 'REQUESTED';
  const status = raw === 'ALL' ? '' : (RETURN_STATUSES as readonly string[]).includes(raw) ? (raw as ReturnStatus) : 'REQUESTED';
  const { data, error, loading, reload } = useLoad(() => api<AdminReturn[]>(`/admin/returns${status ? `?status=${status}` : ''}`), [status]);

  return (
    <section>
      <PageHeader title="Hoàn trả">
        <label htmlFor="r-status">Trạng thái </label>
        <select id="r-status" value={status || 'ALL'} onChange={(e) => setParams({ status: e.target.value })}>
          {RETURN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {RETURN_STATUS_LABEL[s]}
            </option>
          ))}
          <option value="ALL">Tất cả</option>
        </select>
        <Link className="btn" to="/hoan-tra/tao">
          Tạo hoàn trả
        </Link>
      </PageHeader>
      <Notice kind="error">{error}</Notice>
      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : data?.length === 0 ? (
        <p>Không có yêu cầu hoàn trả nào.</p>
      ) : (
        <ul className="stack">
          {(data ?? []).map((r) => (
            <ReturnCard key={r.id} ret={r} onDone={reload} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReturnCard({ ret, onDone }: { ret: AdminReturn; onDone(): Promise<void> }) {
  const [restock, setRestock] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    if (pending) return;
    const msg = decision === 'APPROVED' ? 'Duyệt yêu cầu hoàn trả này?' : 'Từ chối yêu cầu hoàn trả này?';
    if (!window.confirm(msg)) return;
    setPending(true);
    setError('');
    try {
      await api(`/admin/returns/${encodeURIComponent(ret.id)}/decision`, {
        method: 'PATCH',
        body: JSON.stringify(decision === 'APPROVED' ? { decision, restockItemIds: [...restock] } : { decision }),
      });
      await onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  const toggle = (id: string, on: boolean) =>
    setRestock((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <li className="card">
      <p>
        <ReturnBadge status={ret.status} /> · đơn <Link to={`/don-hang/${encodeURIComponent(ret.order.id)}`}>{ret.order.code}</Link> · {ret.order.fullName} ·{' '}
        <a href={telHref(ret.order.phone)}>{ret.order.phone}</a> · {formatDateTime(ret.createdAt)}
      </p>
      {ret.note && <p>Ghi chú: {ret.note}</p>}
      <ul className="stack">
        {ret.items.map((it) => (
          <li key={it.id}>
            {ret.status === 'REQUESTED' ? (
              <label className="check">
                <input type="checkbox" checked={restock.has(it.id)} onChange={(e) => toggle(it.id, e.target.checked)} /> Nhập lại kho
              </label>
            ) : (
              <span className="muted">{it.restocked ? 'Đã nhập lại kho · ' : ''}</span>
            )}{' '}
            {it.orderItem.productName} · {it.orderItem.variantLabel}: trả {it.quantity}/{it.orderItem.quantity} ({RETURN_REASON_LABEL[it.reason]})
          </li>
        ))}
      </ul>
      {ret.status === 'REQUESTED' && (
        <div className="row-actions">
          <button type="button" className="btn" disabled={pending} onClick={() => decide('APPROVED')}>
            Duyệt
          </button>
          <button type="button" className="btn danger" disabled={pending} onClick={() => decide('REJECTED')}>
            Từ chối
          </button>
        </div>
      )}
      <Notice kind="error">{error}</Notice>
    </li>
  );
}
