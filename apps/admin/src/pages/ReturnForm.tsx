import { RETURN_REASONS, type ReturnReason } from '@hatlanh/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { parseIntField, RETURN_REASON_LABEL } from '../lib/format';
import type { AdminOrder } from '../lib/types';
import { errorText } from '../lib/use-load';

type Line = { selected: boolean; quantity: string; reason: ReturnReason; restock: boolean };

/** Shop-created return: look the order up by code, pick items; it is approved immediately. */
export function ReturnForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    const wanted = code.trim().toUpperCase();
    if (!wanted) {
      setError('Vui lòng nhập mã đơn');
      return;
    }
    setError('');
    setOrder(null);
    try {
      const all = await api<AdminOrder[]>('/admin/orders');
      const found = all.find((o) => o.code === wanted);
      if (!found) setError('Không tìm thấy đơn hàng với mã này');
      else if (found.status !== 'COMPLETED') setError('Chỉ tạo hoàn trả cho đơn đã hoàn tất');
      else {
        setOrder(found);
        setLines(Object.fromEntries(found.items.map((it) => [it.id, { selected: false, quantity: '1', reason: 'OTHER' as ReturnReason, restock: true }])));
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  const patch = (id: string, p: Partial<Line>) => setLines((cur) => ({ ...cur, [id]: { ...cur[id], ...p } }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!order || pending) return;
    const chosen = order.items.filter((it) => lines[it.id]?.selected);
    if (chosen.length === 0) {
      setError('Chọn ít nhất 1 sản phẩm');
      return;
    }
    const items = [];
    for (const it of chosen) {
      const l = lines[it.id];
      const quantity = parseIntField(l.quantity);
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > it.quantity) {
        setError(`Số lượng của "${it.productName}" phải từ 1 đến ${it.quantity}`);
        return;
      }
      items.push({ orderItemId: it.id, quantity, reason: l.reason, restock: l.restock });
    }
    setPending(true);
    setError('');
    try {
      await api('/admin/returns', { method: 'POST', body: JSON.stringify({ orderCode: order.code, items, note: note.trim() || undefined }) });
      navigate('/hoan-tra?status=APPROVED', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <PageHeader title="Tạo hoàn trả">
        <Link to="/hoan-tra">Về danh sách</Link>
      </PageHeader>

      <form onSubmit={lookup} noValidate className="card form inline">
        <Field id="rc-code" label="Mã đơn">
          <input id="rc-code" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <button type="submit" className="btn secondary">
          Tìm đơn
        </button>
      </form>

      {order && (
        <form onSubmit={submit} noValidate className="card form">
          <h2>
            Đơn {order.code} · {order.fullName}
          </h2>
          {order.items.map((it) => {
            const l = lines[it.id];
            return (
              <div key={it.id} className="variant-row">
                <label className="check">
                  <input type="checkbox" checked={l.selected} onChange={(e) => patch(it.id, { selected: e.target.checked })} />
                  {it.productName} · {it.variantLabel} (đã mua {it.quantity})
                </label>
                {l.selected && (
                  <>
                    <Field id={`rq-${it.id}`} label={`Số lượng (tối đa ${it.quantity})`}>
                      <input id={`rq-${it.id}`} inputMode="numeric" value={l.quantity} onChange={(e) => patch(it.id, { quantity: e.target.value })} />
                    </Field>
                    <Field id={`rr-${it.id}`} label="Lý do">
                      <select id={`rr-${it.id}`} value={l.reason} onChange={(e) => patch(it.id, { reason: e.target.value as ReturnReason })}>
                        {RETURN_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {RETURN_REASON_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <label className="check">
                      <input type="checkbox" checked={l.restock} onChange={(e) => patch(it.id, { restock: e.target.checked })} /> Nhập lại kho
                    </label>
                  </>
                )}
              </div>
            );
          })}
          <Field id="rc-note" label="Ghi chú (không bắt buộc)">
            <textarea id="rc-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <button type="submit" className="btn" disabled={pending}>
            {pending ? 'Đang tạo…' : 'Tạo hoàn trả'}
          </button>
        </form>
      )}
      <Notice kind="error">{error}</Notice>
    </section>
  );
}
