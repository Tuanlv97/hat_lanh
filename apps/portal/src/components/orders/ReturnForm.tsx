'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FieldMessages, FormAlert, SubmitButton, describedBy, fieldClass, focusById } from '@/components/form';
import { api } from '@/lib/api';
import {
  mapReturnError,
  RETURN_NOTE_MAX,
  RETURN_REASON_LABELS,
  RETURN_REASONS,
  RETURN_SENT,
  validateReturn,
  type CustomerOrder,
  type ReturnLineDraft,
} from '@/lib/orders';

const draftsFor = (order: CustomerOrder, caps: Record<string, number>): ReturnLineDraft[] =>
  order.items.map((it) => ({
    orderItemId: it.id,
    selected: false,
    quantity: '1',
    reason: '',
    max: Math.max(0, Math.min(it.quantity, caps[it.id] ?? it.quantity)),
  }));

/**
 * Return request for a COMPLETED order. The API does not list earlier returns to customers, so each
 * line starts capped at the ordered quantity; RETURN_QUANTITY_EXCEEDED (with `remaining`) and
 * successful requests lower the cap for this visit.
 */
export function ReturnForm({ order }: { order: CustomerOrder }) {
  const [caps, setCaps] = useState<Record<string, number>>({});
  const [lines, setLines] = useState<ReturnLineDraft[]>(() => draftsFor(order, {}));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const sentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  const update = (id: string, patch: Partial<ReturnLineDraft>) =>
    setLines((ls) => ls.map((l) => (l.orderItemId === id ? { ...l, ...patch } : l)));

  const fieldOrder = lines.flatMap((l) => [`qty-${l.orderItemId}`, `reason-${l.orderItemId}`]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setMessage(null);
    const v = validateReturn(lines, note);
    if (!v.ok) {
      setErrors(v.errors);
      if (v.errors.items) focusById(`rt-chon-${lines[0]?.orderItemId}`);
      else {
        const first = [...fieldOrder, 'note'].find((k) => v.errors[k]);
        if (first) focusById(`rt-${first}`);
      }
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    try {
      await api(`/me/orders/${encodeURIComponent(order.code)}/returns`, { method: 'POST', body: JSON.stringify(v.data) });
      const nextCaps = { ...caps };
      for (const it of v.data.items) {
        const cur = nextCaps[it.orderItemId] ?? order.items.find((o) => o.id === it.orderItemId)?.quantity ?? 0;
        nextCaps[it.orderItemId] = Math.max(0, cur - it.quantity);
      }
      setCaps(nextCaps);
      setLines(draftsFor(order, nextCaps));
      setNote('');
      setSent(true);
    } catch (err) {
      const m = mapReturnError(err);
      setMessage(m.message);
      if (m.cap) {
        const { orderItemId, remaining } = m.cap;
        setCaps((c) => ({ ...c, [orderItemId]: remaining }));
        setLines((ls) =>
          ls.map((l) =>
            l.orderItemId === orderItemId
              ? { ...l, max: remaining, quantity: String(Math.max(1, Math.min(Number(l.quantity) || 1, remaining))), selected: remaining > 0 && l.selected }
              : l,
          ),
        );
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="rt-title" className="rounded-[var(--radius-softer)] bg-surface p-5 sm:p-7">
      <h2 id="rt-title" className="text-xl font-semibold">
        Yêu cầu hoàn trả
      </h2>

      {sent ? (
        <div ref={sentRef} tabIndex={-1} role="status" className="mt-4 rounded-[var(--radius-soft)] bg-green-500 px-5 py-4 focus:outline-none">
          <p className="text-lg font-medium">{RETURN_SENT}</p>
          <button type="button" onClick={() => setSent(false)} className="mt-2 inline-flex min-h-11 cursor-pointer items-center font-medium underline underline-offset-4">
            Gửi thêm một yêu cầu khác
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="mt-2">
          <p className="text-base">Chọn sản phẩm cần hoàn trả, số lượng và lý do. Shop sẽ liên hệ để xử lý.</p>

          <fieldset className="mt-5" aria-describedby={errors.items ? 'rt-items-err' : undefined}>
            <legend className="text-base font-medium">Sản phẩm</legend>
            <ul className="mt-3 space-y-3">
              {order.items.map((it) => {
                const l = lines.find((x) => x.orderItemId === it.id)!;
                const qtyId = `rt-qty-${it.id}`;
                const reasonId = `rt-reason-${it.id}`;
                const qtyErr = errors[`qty-${it.id}`];
                const reasonErr = errors[`reason-${it.id}`];
                const qtyHint = l.max > 0 ? `Tối đa ${l.max}` : undefined;
                return (
                  <li key={it.id} className="rounded-2xl bg-green-100 px-4 py-3">
                    <label htmlFor={`rt-chon-${it.id}`} className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        id={`rt-chon-${it.id}`}
                        type="checkbox"
                        checked={l.selected}
                        disabled={pending || l.max === 0}
                        onChange={(e) => update(it.id, { selected: e.target.checked })}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--green-700)]"
                      />
                      <span className="leading-snug">
                        <span className="font-medium">{it.productName}</span> <span className="text-ink-600">· {it.variantLabel} · đã mua {it.quantity}</span>
                        {l.max === 0 && <span className="block text-base text-ink-600">Đã gửi hoàn trả hết số lượng</span>}
                      </span>
                    </label>

                    {l.selected && (
                      <div className="mt-3 grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                        <div>
                          <label htmlFor={qtyId} className="mb-2 block text-base font-medium">
                            Số lượng
                          </label>
                          <input
                            id={qtyId}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={l.max}
                            step={1}
                            value={l.quantity}
                            disabled={pending}
                            onChange={(e) => update(it.id, { quantity: e.target.value })}
                            aria-invalid={qtyErr ? true : undefined}
                            aria-describedby={describedBy(qtyId, qtyErr, qtyHint)}
                            className={fieldClass(!!qtyErr)}
                          />
                          <FieldMessages id={qtyId} error={qtyErr} hint={qtyHint} />
                        </div>
                        <div>
                          <label htmlFor={reasonId} className="mb-2 block text-base font-medium">
                            Lý do
                          </label>
                          <select
                            id={reasonId}
                            value={l.reason}
                            disabled={pending}
                            onChange={(e) => update(it.id, { reason: e.target.value as ReturnLineDraft['reason'] })}
                            aria-invalid={reasonErr ? true : undefined}
                            aria-describedby={describedBy(reasonId, reasonErr)}
                            className={`${fieldClass(!!reasonErr)} cursor-pointer`}
                          >
                            <option value="">Chọn lý do</option>
                            {RETURN_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {RETURN_REASON_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <FieldMessages id={reasonId} error={reasonErr} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {errors.items && (
              <p id="rt-items-err" className="mt-2 text-base font-medium text-error">
                {errors.items}
              </p>
            )}
          </fieldset>

          <div className="mt-5">
            <label htmlFor="rt-note" className="mb-2 block text-base font-medium">
              Ghi chú cho shop <span className="font-normal text-ink-600">(không bắt buộc)</span>
            </label>
            <textarea
              id="rt-note"
              rows={3}
              maxLength={RETURN_NOTE_MAX}
              value={note}
              disabled={pending}
              onChange={(e) => setNote(e.target.value)}
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={describedBy('rt-note', errors.note, 'x')}
              className={`${fieldClass(!!errors.note)} resize-y py-3 leading-relaxed`}
            />
            <FieldMessages id="rt-note" error={errors.note} hint={`${note.length}/${RETURN_NOTE_MAX} ký tự`} />
          </div>

          <FormAlert message={message} />
          <SubmitButton pending={pending} label="Gửi yêu cầu hoàn trả" pendingLabel="Đang gửi…" className="mt-6" />
        </form>
      )}
    </section>
  );
}
