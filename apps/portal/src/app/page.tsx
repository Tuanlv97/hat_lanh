import Link from 'next/link';
import { SHOP_BLURB } from '@/lib/site';

// Placeholder home (Task 14 replaces it with categories and featured products).
const HERO_TILES = [
  { slug: 'gao-lut-do', alt: 'Gạo lứt đỏ' },
  { slug: 'me-rang', alt: 'Mè rang' },
  { slug: 'tra-gao-lut-rang', alt: 'Trà gạo lứt rang' },
  { slug: 'muoi-me', alt: 'Muối mè' },
];

export default function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 sm:px-6 md:grid-cols-2 md:gap-16 md:pt-16 lg:px-8">
      <div>
        <h1 className="text-[clamp(2.4rem,6.2vw,4.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
          Hạt lành, bữa cơm lành
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed">{SHOP_BLURB}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/san-pham" className="inline-flex h-12 items-center rounded-full bg-ink-800 px-7 font-medium text-bg transition-opacity duration-200 hover:opacity-90">
            Xem sản phẩm
          </Link>
          <Link href="/ve-chung-toi" className="inline-flex h-12 items-center rounded-full bg-green-100 px-6 font-medium transition-colors duration-200 hover:bg-green-500">
            Về chúng tôi
          </Link>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Một vài sản phẩm">
        {HERO_TILES.map((t, i) => (
          <li key={t.slug} className={i % 2 === 1 ? 'translate-y-6 sm:translate-y-10' : ''}>
            <Link href={`/san-pham/${t.slug}`} className="block overflow-hidden rounded-[var(--radius-softer)] bg-green-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG placeholder */}
              <img src={`/placeholder/${t.slug}.svg`} alt={t.alt} className="aspect-square h-full w-full object-cover" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
