import { assetUrl } from '@/lib/api';
import type { ResolvedLine } from '@/lib/cart';

export const LOW_STOCK = 10;

/** Product thumbnail for a cart line; a soft tile when the product is gone. */
export function LineThumb({ line, size = 'md' }: { line: ResolvedLine; size?: 'md' | 'sm' }) {
  const box = size === 'sm' ? 'h-16 w-16' : 'h-20 w-20 sm:h-24 sm:w-24';
  if (!line.item) return <div className={`${box} shrink-0 rounded-2xl bg-green-100`} aria-hidden="true" />;
  const src = line.item.image ? assetUrl(line.item.image) : `/placeholder/${line.item.slug}.svg`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- API images and SVG placeholders, sizes unknown
    <img src={src} alt="" loading="lazy" className={`${box} shrink-0 rounded-2xl bg-green-100 object-cover ${line.status === 'ok' || line.status === 'over_stock' ? '' : 'opacity-60'}`} />
  );
}

/** What blocks (or almost blocks) a line, in the customer's words; null when there is nothing to say. */
export function lineNotice(line: ResolvedLine): { badge: string | null; text: string } | null {
  switch (line.status) {
    case 'unavailable':
      return { badge: 'Không còn bán', text: 'Bạn xóa sản phẩm này để đặt hàng.' };
    case 'sold_out':
      return { badge: 'Hết hàng', text: 'Bạn xóa sản phẩm này để đặt hàng.' };
    case 'over_stock':
      return { badge: `Chỉ còn ${line.item?.stock ?? 0}`, text: 'Bạn giảm số lượng để đặt hàng.' };
    default:
      return line.item && line.item.stock < LOW_STOCK ? { badge: null, text: `Chỉ còn ${line.item.stock} sản phẩm` } : null;
  }
}

export function LineNotice({ line, id }: { line: ResolvedLine; id?: string }) {
  const n = lineNotice(line);
  if (!n) return null;
  return (
    <p id={id} className={`mt-2 text-base ${n.badge ? 'font-medium text-error' : 'text-ink-600'}`}>
      {n.badge && (
        <span className="mr-2 inline-flex rounded-full bg-honey-400 px-2.5 py-0.5 text-sm font-semibold text-ink-800">{n.badge}</span>
      )}
      {n.text}
    </p>
  );
}
