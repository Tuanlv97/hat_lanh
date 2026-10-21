import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { StateMessage } from '@/components/StateMessage';
import { hasPriceRange, isSoldOut, priceFrom } from '@/lib/catalog';
import { getCategories, getProducts } from '@/lib/catalog-server';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 100) ?? '';
}

function listHref(category: string, q: string): string {
  const p = new URLSearchParams();
  if (category) p.set('category', category);
  if (q) p.set('q', q);
  const s = p.toString();
  return s ? `/san-pham?${s}` : '/san-pham';
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const category = one(sp.category);
  const cats = category ? await getCategories() : null;
  const name = cats?.ok ? cats.data.find((c) => c.slug === category)?.name : undefined;
  return {
    title: name ? `${name} · Sản phẩm` : 'Sản phẩm',
    description: 'Gạo lứt, trà gạo rang, mè, muối mè, mơ muối và các loại hạt cho bữa ăn chay thực dưỡng, giá theo từng quy cách.',
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = one(sp.category);
  const q = one(sp.q);
  const [cats, prods] = await Promise.all([getCategories(), getProducts({ category, q })]);
  const categories = cats.ok ? cats.data : [];
  const activeCat = categories.find((c) => c.slug === category);

  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-5 text-base transition-all duration-200 ${
      on ? 'bg-primary font-medium text-bg shadow-[var(--shadow-sm)]' : 'bg-green-100 text-ink-800 hover:-translate-y-0.5 hover:bg-green-500'
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
            {activeCat ? activeCat.name : 'Sản phẩm'}
          </h1>
          <p className="mt-4 max-w-[48ch] text-lg">
            Hạt và gia vị cho bữa ăn chay thực dưỡng. Mỗi sản phẩm có nhiều quy cách theo cân nặng, giá riêng cho từng loại.
          </p>
        </div>

        {/* Plain GET form: search works without JavaScript and keeps the chosen group. */}
        <form action="/san-pham" method="get" role="search" className="w-full md:w-[22rem]">
          <label htmlFor="tim-san-pham" className="mb-2 block text-base font-medium">
            Tìm sản phẩm
          </label>
          <div className="flex gap-2">
            {activeCat && <input type="hidden" name="category" value={activeCat.slug} />}
            <input
              id="tim-san-pham"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Ví dụ: gạo lứt"
              autoComplete="off"
              maxLength={100}
              className="h-12 min-w-0 flex-1 rounded-full bg-surface px-5 text-base text-ink-800 ring-1 ring-green-500 placeholder:text-ink-600 focus:ring-2 focus:ring-green-700 focus:outline-none"
            />
            <button type="submit" className="btn btn-primary shrink-0 px-5">
              Tìm
            </button>
          </div>
        </form>
      </div>

      {categories.length > 0 && (
        <nav aria-label="Lọc theo nhóm" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href={listHref('', q)} className={chip(!activeCat)} aria-current={!activeCat ? 'page' : undefined}>
                Tất cả
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={listHref(c.slug, q)} className={chip(activeCat?.slug === c.slug)} aria-current={activeCat?.slug === c.slug ? 'page' : undefined}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <section aria-labelledby="ket-qua" className="mt-10 sm:mt-14">
        {!prods.ok ? (
          <StateMessage
            role="alert"
            title="Chưa tải được sản phẩm"
            body="Kết nối tới cửa hàng đang chậm. Bạn thử tải lại trang sau ít phút nhé."
            action={{ href: listHref(category, q), label: 'Tải lại' }}
          />
        ) : (
          <>
            <h2 id="ket-qua" className="text-lg font-medium" aria-live="polite">
              {q ? `${prods.data.length} kết quả cho “${q}”` : `${prods.data.length} sản phẩm`}
            </h2>
            {prods.data.length === 0 ? (
              <div className="mt-6">
                <StateMessage
                  title="Chưa có sản phẩm phù hợp"
                  body={q ? 'Thử gõ ngắn hơn, ví dụ “gạo” hoặc “trà”, hoặc xem tất cả sản phẩm.' : 'Nhóm này hiện chưa có sản phẩm đang bán.'}
                  action={{ href: '/san-pham', label: 'Xem tất cả sản phẩm' }}
                />
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-4">
                {prods.data.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      slug={p.slug}
                      name={p.name}
                      priceFrom={priceFrom(p.variants) ?? p.minPriceVnd}
                      image={p.images[0]}
                      multipleVariants={hasPriceRange(p.variants)}
                      outOfStock={isSoldOut(p.variants)}
                    />
                    <p className="mt-1 px-1 text-base text-ink-600">{p.variants.map((v) => v.label).join(' · ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
