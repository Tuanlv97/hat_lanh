import { formatVnd } from '@/lib/format';

type PriceProps = {
  amount: number;
  /** Prefix "Từ" for a price-from across several variants. */
  from?: boolean;
  className?: string;
};

export function Price({ amount, from = false, className = '' }: PriceProps) {
  return (
    <span className={`tabular-nums whitespace-nowrap ${className}`}>
      {from && <span className="font-normal text-ink-600">Từ </span>}
      {formatVnd(amount)}
    </span>
  );
}
