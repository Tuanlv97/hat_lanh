import Link from 'next/link';
import { Price } from '@/components/Price';
import type { StageCategory } from './HomeStage';

/** Shallow scallops along one edge of the paper sheet, filled in the sheet's colour. */
function Scallops({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block h-2.5 w-full text-surface ${flip ? 'rotate-180' : ''}`}
    >
      <path
        fill="currentColor"
        d={`M0 10 ${Array.from({ length: 16 }, (_, i) => `Q${i * 20 + 10} -2 ${(i + 1) * 20} 10`).join(' ')} Z`}
      />
    </svg>
  );
}

/** The whole catalogue as one printed price card: group, product, every weight and its price. */
export function PriceSheet({ categories }: { categories: StageCategory[] }) {
  return (
    <div className="mx-auto max-w-[40rem]">
      <Scallops />
      <div className="bg-surface px-6 py-10 sm:px-14 sm:py-14">
        <p className="text-center text-xl font-semibold tracking-[-0.01em]">Hạt Lành</p>
        <p className="mt-1 text-center text-base text-ink-600">Giá theo quy cách, đơn vị đồng</p>

        <div className="mt-10 space-y-12">
          {categories.map((c) => (
            <section key={c.slug} aria-labelledby={`bg-${c.slug}`}>
              <h3 id={`bg-${c.slug}`} className="text-center text-xl font-semibold tracking-[-0.01em]">
                <Link href={`/san-pham?category=${encodeURIComponent(c.slug)}`} className="hover:underline underline-offset-4">
                  {c.name}
                </Link>
              </h3>
              <ul className="mt-5 space-y-5">
                {c.products.map((p) => (
                  <li key={p.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6">
                    <Link
                      href={`/san-pham/${p.slug}`}
                      className="text-lg font-medium underline-offset-4 transition-colors duration-200 hover:text-green-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <ul className="text-right text-base">
                      {p.variants.map((v) => (
                        <li key={v.id} className="whitespace-nowrap">
                          <span className="text-ink-600">{v.label}</span>{' '}
                          {v.stock > 0 ? <Price amount={v.priceVnd} className="font-medium" /> : <span className="font-medium">Hết hàng</span>}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <Scallops flip />
    </div>
  );
}
