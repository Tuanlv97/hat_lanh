import Link from 'next/link';
import { assetUrl } from '@/lib/api';
import { Price } from './Price';

export type ProductCardProps = {
  slug: string;
  name: string;
  /** Lowest variant price in VND. */
  priceFrom: number;
  /** Image URL; falls back to the bundled placeholder for the slug. */
  image?: string | null;
  /** More than one variant: show "Từ" before the price. */
  multipleVariants?: boolean;
  outOfStock?: boolean;
};

export function ProductCard({ slug, name, priceFrom, image, multipleVariants = true, outOfStock = false }: ProductCardProps) {
  const src = image ? assetUrl(image) : `/placeholder/${slug}.svg`;
  return (
    <Link href={`/san-pham/${slug}`} className="group flex flex-col gap-3 rounded-[var(--radius-softer)] p-2 -m-2 transition-colors duration-200 hover:bg-green-100/60">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-soft)] bg-green-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- API images and SVG placeholders, sizes unknown */}
        <img
          src={src}
          alt={name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100 ${outOfStock ? 'opacity-60' : ''}`}
        />
        {outOfStock && (
          <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1 text-sm font-medium text-ink-800">Hết hàng</span>
        )}
      </div>
      <div className="px-1">
        <h3 className="text-base leading-snug font-medium text-ink-800">{name}</h3>
        <Price amount={priceFrom} from={multipleVariants} className="mt-1 block text-base font-semibold text-ink-800" />
      </div>
    </Link>
  );
}
