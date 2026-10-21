'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { hasPriceRange, isSoldOut, priceFrom, type ProductSummary } from '@/lib/catalog';
import { PLATES } from '@/lib/plates';

export type StageCategory = { slug: string; name: string; products: ProductSummary[] };

type HomeStageProps = {
  /** The hero copy (server-rendered h1, sentence, actions). */
  hero: ReactNode;
  categories: StageCategory[];
};

const HOLD_MS = 6000;

/**
 * The split stage: a botanical plate (decoration) stays put on one half while the other half scrolls.
 * The plates crossfade once through the set and stop; the visitor can pause or replay them, and
 * choosing a group stops them, and hovering or focusing the plate pauses them (WCAG 2.2.2).
 */
const pill = (on: boolean) =>
  `inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-lg transition-all duration-200 active:scale-[0.97] ${
    on ? 'bg-primary font-medium text-bg shadow-[var(--shadow-sm)]' : 'bg-green-100 text-ink-800 hover:-translate-y-0.5 hover:bg-green-500'
  }`;

export function HomeStage({ hero, categories }: HomeStageProps) {
  const [active, setActive] = useState(categories[0]?.slug ?? '');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [held, setHeld] = useState(false); // hover or keyboard focus inside the stage
  const [steps, setSteps] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const ok = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMotionOk(ok);
    setPlaying(ok);
  }, []);

  // One full cycle, then stop. Paused while held, while the tab is hidden, or when the visitor paused it.
  useEffect(() => {
    if (!playing || held) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % PLATES.length);
      setSteps((n) => n + 1);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [playing, held]);

  useEffect(() => {
    if (steps >= PLATES.length) {
      setPlaying(false);
      setSteps(0);
    }
  }, [steps]);

  const stop = () => setPlaying(false);
  const current = categories.find((c) => c.slug === active) ?? categories[0];
  const plate = PLATES[index] ?? PLATES[0];
  const running = playing && !held;

  return (
    // Phone: hero, plate, groups. Desktop: hero and groups scroll on the left while the plate holds the right half.
    <div
      className="mx-auto grid max-w-6xl gap-x-10 gap-y-10 px-4 sm:px-6 md:grid-cols-2 md:grid-rows-[auto_1fr] lg:gap-x-14 lg:px-8"
      onPointerDown={(e) => {
        if (!(e.target as Element).closest('[data-plate-toggle]')) stop();
      }}
      onKeyDown={(e) => {
        if (!(e.target as Element).closest('[data-plate-toggle]')) stop();
      }}
    >
      <div className="md:col-start-1 md:row-start-1">{hero}</div>

      {/* The fixed half: a plate on white paper, a caption bar along its foot. */}
      <div className="md:col-start-2 md:row-span-2 md:row-start-1">
        <figure
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
          }}
          className="relative h-[44svh] min-h-72 overflow-hidden rounded-[var(--radius-softer)] bg-surface md:sticky md:top-[5.25rem] md:h-[calc(100svh-6.5rem)] md:min-h-[32rem]">
          {PLATES.map((p, i) => (
            <div key={p.key} className={`plate absolute inset-0 bottom-14 ${p.key === plate.key ? 'opacity-100' : 'opacity-0'}`} aria-hidden={p.key !== plate.key}>
              <div
                className={`absolute inset-4 sm:inset-8 ${p.key === plate.key && motionOk ? 'plate-drift' : ''}`}
                style={{ animationPlayState: running ? 'running' : 'paused' }}
              >
                <Image src={p.src} alt={p.key === plate.key ? p.alt : ''} fill priority={i === 0} sizes="(min-width: 768px) 46vw, 92vw" className="object-contain" />
              </div>
            </div>
          ))}
          <figcaption className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-between gap-3 bg-green-100 pr-2 pl-5 text-base">
            <span className="truncate font-medium">{plate.caption}</span>
            {motionOk && (
              <button
                type="button"
                data-plate-toggle
                onClick={() => setPlaying((v) => !v)}
                className="inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 sm:px-4 text-base font-medium transition-colors duration-200 hover:bg-green-500"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" fill="currentColor">
                  {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M5 3l8 5-8 5z" />}
                </svg>
                <span className="sr-only sm:not-sr-only">{playing ? 'Dừng đổi tranh' : 'Xem các tranh'}</span>
              </button>
            )}
          </figcaption>
        </figure>
      </div>

      {/* The reading half. */}
      <div className="md:col-start-1 md:row-start-2">
        {categories.length > 0 && (
          <section aria-labelledby="nhom-hat" className="mt-14 md:mt-24">
            <h2 id="nhom-hat" className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em]">
              Sản phẩm theo nhóm
            </h2>
            <p className="mt-3 max-w-[46ch] text-lg">Chọn một nhóm để xem các sản phẩm trong nhóm.</p>

            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Nhóm sản phẩm">
              {categories.map((c) => {
                const on = c.slug === current?.slug;
                return (
                  <li key={c.slug}>
                    {hydrated ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActive(c.slug);
                          stop();
                        }}
                        aria-pressed={on}
                        className={pill(on)}
                      >
                        {c.name}
                      </button>
                    ) : (
                      // Before hydration (or without JS) each group is a plain link to the filtered list.
                      <Link href={`/san-pham?category=${encodeURIComponent(c.slug)}`} className={pill(on)}>
                        {c.name}
                      </Link>
                    )}
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
