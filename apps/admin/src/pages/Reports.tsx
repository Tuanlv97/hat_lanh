import { useMemo, useState, type FormEvent } from 'react';
import { BestSellerBars, ReasonLegend, ReturnReasonBars } from '../components/charts/Charts';
import { RevenueLine } from '../components/charts/Charts';
import { Field, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { formatVnd, RETURN_REASON_LABEL } from '../lib/format';
import {
  defaultRange,
  formatRate,
  GROUP_LABEL,
  periodLabel,
  validateRange,
  type BestSeller,
  type ReturnRow,
  type RevenueGroup,
  type RevenuePoint,
} from '../lib/reports';
import { RETURN_REASONS } from '@hatlanh/shared';
import { useLoad } from '../lib/use-load';

export function Reports() {
  const initial = useMemo(() => defaultRange(), []);
  const [draft, setDraft] = useState(initial);
  const [range, setRange] = useState(initial);
  const [group, setGroup] = useState<RevenueGroup>('day');
  const [rangeError, setRangeError] = useState('');

  const qs = `from=${range.from}&to=${range.to}`;
  const best = useLoad(() => api<BestSeller[]>(`/admin/reports/best-sellers?${qs}`), [qs]);
  const returns = useLoad(() => api<ReturnRow[]>(`/admin/reports/returns?${qs}`), [qs]);
  const revenue = useLoad(() => api<RevenuePoint[]>(`/admin/reports/revenue?${qs}&group=${group}`), [qs, group]);

  function apply(e: FormEvent) {
    e.preventDefault();
    const problem = validateRange(draft.from, draft.to);
    setRangeError(problem ?? '');
    if (!problem) setRange(draft);
  }

  const total = (revenue.data ?? []).reduce((s, p) => s + p.revenueVnd, 0);

  return (
    <section>
      <PageHeader title="Báo cáo" />
      <form onSubmit={apply} noValidate className="card form range">
        <Field id="rp-from" label="Từ ngày">
          <input id="rp-from" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </Field>
        <Field id="rp-to" label="Đến ngày">
          <input id="rp-to" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </Field>
        <button type="submit" className="btn">
          Xem báo cáo
        </button>
        <Notice kind="error">{rangeError}</Notice>
      </form>
      <p className="muted">
        Số liệu từ {range.from} đến {range.to} (giờ Việt Nam).
      </p>

      <div className="card">
        <h2>Sản phẩm bán chạy</h2>
        <Notice kind="error">{best.error}</Notice>
        {best.loading && !best.data ? (
          <p role="status">Đang tải…</p>
        ) : best.data?.length ? (
          <>
            <BestSellerBars rows={best.data} />
            <details>
              <summary>Xem dạng bảng</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Sản phẩm</th>
                    <th scope="col">Đã bán</th>
                  </tr>
                </thead>
                <tbody>
                  {best.data.map((r) => (
                    <tr key={r.productId}>
                      <td>{r.name}</td>
                      <td>{r.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <p>Chưa có đơn hàng nào trong khoảng này.</p>
        )}
      </div>

      <div className="card">
        <h2>Hoàn trả theo sản phẩm</h2>
        <p className="muted">Chỉ tính yêu cầu đã duyệt. Tỷ lệ = số lượng hoàn / số lượng bán trong cùng khoảng.</p>
        <Notice kind="error">{returns.error}</Notice>
        {returns.loading && !returns.data ? (
          <p role="status">Đang tải…</p>
        ) : returns.data?.length ? (
          <>
            <ReasonLegend />
            <ReturnReasonBars rows={returns.data} />
            <div className="table-wrap flat">
              <table>
                <caption className="sr-only">Hoàn trả theo sản phẩm</caption>
                <thead>
                  <tr>
                    <th scope="col">Sản phẩm</th>
                    <th scope="col">Hoàn</th>
                    <th scope="col">Bán</th>
                    <th scope="col">Tỷ lệ</th>
                    {RETURN_REASONS.map((r) => (
                      <th key={r} scope="col">
                        {RETURN_REASON_LABEL[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returns.data.map((r) => (
                    <tr key={r.productId}>
                      <td>{r.name}</td>
                      <td>{r.returnedQuantity}</td>
                      <td>{r.soldQuantity}</td>
                      <td>{formatRate(r.rate)}</td>
                      {RETURN_REASONS.map((k) => (
                        <td key={k}>{r.reasons[k]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>Không có hoàn trả nào được duyệt trong khoảng này.</p>
        )}
      </div>

      <div className="card">
        <div className="page-head">
          <h2>Doanh thu</h2>
          <div className="seg-toggle" role="group" aria-label="Nhóm theo">
            {(Object.keys(GROUP_LABEL) as RevenueGroup[]).map((g) => (
              <button key={g} type="button" className={g === group ? 'on' : ''} aria-pressed={g === group} onClick={() => setGroup(g)}>
                {GROUP_LABEL[g]}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">Đơn đã hoàn tất theo ngày hoàn tất, trừ hàng hoàn đã duyệt, chưa gồm phí vận chuyển.</p>
        <Notice kind="error">{revenue.error}</Notice>
        {revenue.loading && !revenue.data ? (
          <p role="status">Đang tải…</p>
        ) : revenue.data?.length ? (
          <>
            <p className="big">{formatVnd(total)}</p>
            <RevenueLine points={revenue.data} group={group} />
            <details>
              <summary>Xem dạng bảng</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{GROUP_LABEL[group]}</th>
                    <th scope="col">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.data.map((p) => (
                    <tr key={p.period}>
                      <td>{periodLabel(p.period, group)}</td>
                      <td>{formatVnd(p.revenueVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <p>Chưa có đơn hoàn tất trong khoảng này.</p>
        )}
      </div>
    </section>
  );
}
