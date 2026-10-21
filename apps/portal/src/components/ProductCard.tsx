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
  /** Several variants at different prices: show "Từ" before the price. Callers pass `hasPriceRange(variants)`. */
  multipleVariants?: boolean;
  outOfStock?: boolean;
};

export function ProductCard({ slug, name, priceFrom, image, multipleVariants = false, outOfStock = false }: ProductCardProps) {
  const src = image ? assetUrl(image) : `/placeholder/${slug}.svg`;
  return (
    <Link href={`/san-pham/${slug}`} className="group card-lift flex h-full flex-col gap-3 rounded-[var(--radius-softer)] bg-surface p-2.5 ring-1 ring-green-500/30">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-soft)] bg-green-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- API images and SVG placeholders, sizes unknown */}
        <img
          src={src}
          alt={name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100 ${outOfStock ? 'opacity-60' : ''}`}
        />
        {!outOfStock && (
          <span
            aria-hidden="true"
            className="absolute right-3 bottom-3 inline-flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-honey-400 text-ink-800 opacity-0 shadow-[var(--shadow-md)] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-md:hidden"
          >
            →
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1 text-sm font-medium text-ink-800">Hết hàng</span>
        )}
      </div>
      <div className="px-1.5 pb-1.5">
        <h3 className="text-base leading-snug font-medium text-ink-800">{name}</h3>
        <Price amount={priceFrom} from={multipleVariants} className="mt-1 block text-base font-semibold text-ink-800" />
      </div>
    </Link>
  );
}
