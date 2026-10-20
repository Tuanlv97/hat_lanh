import { RETURN_REASONS } from '@hatlanh/shared';
import { useState } from 'react';
import { RETURN_REASON_LABEL, formatVnd } from '../../lib/format';
import { compactVnd, niceMax, periodLabel, reasonSegments, type BestSeller, type ReturnRow, type RevenueGroup, type RevenuePoint } from '../../lib/reports';

/** Reason colors follow the reason (fixed order), validated as a 4-slot categorical set. */
export const REASON_COLOR: Record<(typeof RETURN_REASONS)[number], string> = {
  DAMAGED: 'var(--series-1)',
  WRONG_ITEM: 'var(--series-2)',
  CHANGED_MIND: 'var(--series-3)',
  OTHER: 'var(--series-4)',
};

/** Horizontal bars, one row per product, value printed at the end of each bar. */
export function BestSellerBars({ rows }: { rows: BestSeller[] }) {
  const max = niceMax(Math.max(0, ...rows.map((r) => r.quantity)));
  return (
    <ul className="bars" aria-label="Biểu đồ sản phẩm bán chạy">
      {rows.map((r) => (
        <li key={r.productId} title={`${r.name}: ${r.quantity} sản phẩm`}>
          <span className="bar-label">{r.name}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(r.quantity / max) * 100}%` }} />
          </span>
          <span className="bar-value">{r.quantity}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReasonLegend() {
  return (
    <ul className="legend" aria-label="Chú thích lý do hoàn trả">
      {RETURN_REASONS.map((r) => (
        <li key={r}>
          <span className="swatch" style={{ background: REASON_COLOR[r] }} /> {RETURN_REASON_LABEL[r]}
        </li>
      ))}
    </ul>
  );
}

/** Stacked bar per product: segments are the return reasons, each labeled with its count. */
export function ReturnReasonBars({ rows }: { rows: ReturnRow[] }) {
  const max = niceMax(Math.max(0, ...rows.map((r) => r.returnedQuantity)));
  return (
    <ul className="bars" aria-label="Biểu đồ hoàn trả theo sản phẩm và lý do">
      {rows.map((r) => (
        <li key={r.productId}>
          <span className="bar-label">{r.name}</span>
          <span className="bar-track stacked" style={{ width: '100%' }}>
            <span className="stack-row" style={{ width: `${(r.returnedQuantity / max) * 100}%` }}>
              {reasonSegments(r).map((s) => (
                <span
                  key={s.reason}
                  className="seg"
                  style={{ flexGrow: s.quantity, background: REASON_COLOR[s.reason] }}
                  title={`${RETURN_REASON_LABEL[s.reason]}: ${s.quantity}`}
                >
                  {s.quantity}
                </span>
              ))}
            </span>
          </span>
          <span className="bar-value">{r.returnedQuantity}</span>
        </li>
      ))}
    </ul>
  );
}

const W = 640;
const H = 240;
const PAD = { l: 52, r: 16, t: 12, b: 32 };

/** Revenue line: 2px line, markers, light grid, and a crosshair tooltip that follows the pointer or focus. */
export function RevenueLine({ points, group }: { points: RevenuePoint[]; group: RevenueGroup }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.revenueVnd)));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.revenueVnd).toFixed(1)}`).join(' ');

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setActive(best);
  }

  const a = active !== null ? points[active] : null;
  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ doanh thu theo thời gian" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="tick">
              {compactVnd(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.period} x={x(i)} y={H - 10} textAnchor="middle" className="tick">
              {periodLabel(p.period, group)}
            </text>
          ) : null,
        )}
        {a && active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={PAD.t + innerH} className="crosshair" />}
        <path d={path} className="line" fill="none" />
        {points.map((p, i) => (
          <circle
            key={p.period}
            cx={x(i)}
            cy={y(p.revenueVnd)}
            r={active === i ? 6 : 4}
            className="marker"
            tabIndex={0}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${periodLabel(p.period, group)}: ${formatVnd(p.revenueVnd)}`}
          />
        ))}
      </svg>
      <p className="tooltip" role="status">
        {a ? `${periodLabel(a.period, group)}: ${formatVnd(a.revenueVnd)}` : 'Rê chuột vào biểu đồ để xem từng mốc.'}
      </p>
    </div>
  );
}
