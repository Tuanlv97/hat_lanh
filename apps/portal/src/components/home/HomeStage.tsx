'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { hasPriceRange, isSoldOut, priceFrom, type ProductSummary } from '@/lib/catalog';
import { PLATES, plateForCategory } from '@/lib/plates';

export type StageCategory = { slug: string; name: string; products: ProductSummary[] };

type HomeStageProps = {
  /** The hero copy (server-rendered h1, sentence, actions). */
  hero: ReactNode;
  categories: StageCategory[];
};

const HOLD_MS = 6000;

/**
 * The split stage: a botanical plate stays put on one half while the other half scrolls.
 * Picking a group of grains swaps both the products shown and the plant on the plate.
 */
export function HomeStage({ hero, categories }: HomeStageProps) {
  const [active, setActive] = useState(categories[0]?.slug ?? '');
  const [plateKey, setPlateKey] = useState(PLATES[0].key);
  const [chosen, setChosen] = useState(false);

  // Slow crossfade through the plates until the visitor picks a group; paused when the tab is hidden.
  useEffect(() => {
    if (chosen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setPlateKey((k) => PLATES[(PLATES.findIndex((p) => p.key === k) + 1) % PLATES.length].key);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [chosen]);

  const choose = useCallback((slug: string, e: MouseEvent) => {
    e.preventDefault();
    setActive(slug);
    setPlateKey(plateForCategory(slug).key);
    setChosen(true);
  }, []);

  const current = categories.find((c) => c.slug === active) ?? categories[0];
  const plate = PLATES.find((p) => p.key === plateKey) ?? PLATES[0];

  return (
    // Phone: hero, plate, groups. Desktop: hero and groups scroll on the left while the plate holds the right half.
    <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-10 px-4 sm:px-6 md:grid-cols-2 md:grid-rows-[auto_1fr] lg:gap-x-14 lg:px-8">
      <div className="md:col-start-1 md:row-start-1">{hero}</div>

      {/* The fixed half: a plate on white paper, a caption bar along its foot. */}
      <div className="md:col-start-2 md:row-span-2 md:row-start-1">
        <figure className="relative h-[44svh] min-h-72 overflow-hidden rounded-[var(--radius-softer)] bg-surface md:sticky md:top-[5.25rem] md:h-[calc(100svh-6.5rem)] md:min-h-[32rem]">
          {PLATES.map((p, i) => (
            <div key={p.key} className={`plate absolute inset-0 bottom-14 ${p.key === plate.key ? 'opacity-100' : 'opacity-0'}`} aria-hidden={p.key !== plate.key}>
              <div className={`absolute inset-4 sm:inset-8 ${p.key === plate.key ? 'plate-drift' : ''}`}>
                <Image src={p.src} alt={p.key === plate.key ? p.alt : ''} fill priority={i === 0} sizes="(min-width: 768px) 46vw, 92vw" className="object-contain" />
              </div>
            </div>
          ))}
          <figcaption className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-between gap-3 bg-green-100 px-5 text-base">
            <span aria-live="polite" className="truncate font-medium">{plate.caption}</span>
            {current && chosen && (
              <span className="shrink-0 text-ink-600">
                {current.name} · {current.products.length} sản phẩm
              </span>
            )}
          </figcaption>
        </figure>
      </div>

      {/* The reading half. */}
      <div className="md:col-start-1 md:row-start-2">
        {categories.length > 0 && (
          <section aria-labelledby="nhom-hat" className="mt-14 md:mt-24">
            <h2 id="nhom-hat" className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em]">
              Chọn theo nhóm hạt
            </h2>
            <p className="mt-3 max-w-[46ch] text-lg">Mỗi nhóm một cây: lúa cho gạo lứt, chè cho trà, mè cho gia vị chấm, hạt cho bữa sáng.</p>

            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Nhóm sản phẩm">
              {categories.map((c) => {
                const on = c.slug === current?.slug;
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/san-pham?category=${encodeURIComponent(c.slug)}`}
                      onClick={(e) => choose(c.slug, e)}
                      aria-pressed={on}
                      role="button"
                      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-lg transition-colors duration-200 active:scale-[0.98] ${
                        on ? 'bg-ink-800 font-medium text-bg' : 'bg-green-100 text-ink-800 hover:bg-green-500'
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {current && (
              <div key={current.slug} className="toast-in mt-8">
                <ul className="grid grid-cols-2 gap-x-5 gap-y-8">
                  {current.products.map((p) => (
                    <li key={p.id}>
                      <ProductCard
                        slug={p.slug}
                        name={p.name}
                        priceFrom={priceFrom(p.variants) ?? p.minPriceVnd}
                        image={p.images[0]}
                        multipleVariants={hasPriceRange(p.variants)}
                        outOfStock={isSoldOut(p.variants)}
                      />
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/san-pham?category=${encodeURIComponent(current.slug)}`}
                  className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full font-medium underline decoration-green-500 decoration-2 underline-offset-[6px] transition-colors duration-200 hover:decoration-ink-800"
                >
                  Xem tất cả {current.name.toLocaleLowerCase('vi')}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
