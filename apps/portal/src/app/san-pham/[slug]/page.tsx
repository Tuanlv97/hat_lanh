import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { Gallery } from '@/components/product/Gallery';
import { ReviewEntry } from '@/components/product/ReviewEntry';
import { Stars } from '@/components/product/Stars';
import { VariantPicker } from '@/components/product/VariantPicker';
import { Reveal } from '@/components/Reveal';
import { StateMessage } from '@/components/StateMessage';
import { assetUrl } from '@/lib/api';
import { formatDateVi, hasPriceRange, isOriginPlaceholder, isSoldOut, priceFrom, ratingSummary } from '@/lib/catalog';
import { getProduct, getProducts } from '@/lib/catalog-server';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

function summarize(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getProduct(slug);
  if (!res.ok) return { title: res.notFound ? 'Không tìm thấy sản phẩm' : 'Sản phẩm' };
  const p = res.data;
  const description = summarize(p.description);
  const image = assetUrl(p.images[0] ?? `/placeholder/${p.slug}.svg`);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/san-pham/${p.slug}` },
    openGraph: { type: 'website', title: p.name, description, url: `/san-pham/${p.slug}`, images: [{ url: image, alt: p.name }] },
  };
}

const icon = (d: ReactNode) => (
  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
    <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  </span>
);

const ICON_ORIGIN = <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />;
const ICON_BENEFIT = <path d="M5 21c0-9 5-15 14-16-1 9-6 15-14 16ZM5 21c2-5 5-8 9-10" />;
const ICON_DESC = <path d="M7 4h7l4 4v12H7zM14 4v4h4M10 12h5M10 16h5" />;

const ASSURANCES = [
  { title: 'Giá rõ ràng', body: 'Giá theo từng quy cách', icon: <path d="M4 7h16M4 12h16M4 17h10" /> },
  { title: 'Tra cứu đơn', body: 'Theo dõi bằng mã đơn', icon: <path d="M11 4a7 7 0 1 0 4.9 12l4.1 4M11 4a7 7 0 0 1 4.9 12" /> },
  { title: 'Đổi trả', body: 'Gửi yêu cầu ngay trên đơn', icon: <path d="M4 9h12a4 4 0 0 1 0 8H9M4 9l4-4M4 9l4 4" /> },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[0] ?? '?').toLocaleUpperCase('vi');
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const res = await getProduct(slug);
  if (!res.ok) {
    if (res.notFound) notFound();
    return (
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:px-8">
        <StateMessage
          role="alert"
          title="Chưa tải được sản phẩm"
          body="Kết nối tới cửa hàng đang chậm. Bạn thử tải lại trang sau ít phút nhé."
          action={{ href: `/san-pham/${encodeURIComponent(slug)}`, label: 'Tải lại' }}
        />
      </div>
    );
  }

  const p = res.data;
  const placeholderOrigin = isOriginPlaceholder(p.origin);
  const siblings = await getProducts({ category: p.category.slug });
  const related = siblings.ok ? siblings.data.filter((x) => x.id !== p.id).slice(0, 4) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <nav aria-label="Đường dẫn" className="text-base">
        <ol className="flex flex-wrap items-center gap-x-1.5 text-ink-600">
          <li>
            <Link href="/san-pham" className="rounded-full px-1 hover:text-ink-800 hover:underline underline-offset-4">
              Sản phẩm
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={`/san-pham?category=${encodeURIComponent(p.category.slug)}`} className="rounded-full px-1 hover:text-ink-800 hover:underline underline-offset-4">
              {p.category.name}
            </Link>
          </li>
          <li aria-hidden="true" className="max-sm:hidden">›</li>
          <li aria-current="page" className="truncate px-1 font-medium text-ink-800 max-sm:hidden">
            {p.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
        {/* The fixed half: the product stays in view while its details scroll. */}
        <div className="rise md:sticky md:top-24 md:self-start">
          <Gallery images={p.images} name={p.name} fallback={`/placeholder/${p.slug}.svg`} />
        </div>

        <div>
          <p className="rise inline-flex rounded-full bg-green-100 px-3.5 py-1 text-sm font-medium">{p.category.name}</p>
          <h1 className="rise rise-1 mt-4 text-[clamp(2.25rem,4.6vw,3.6rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance">{p.name}</h1>
          <a href="#danh-gia" className="rise rise-2 mt-3 inline-flex min-h-11 items-center gap-2 rounded-full text-base hover:underline underline-offset-4">
            {p.reviewCount > 0 && <Stars value={p.averageRating} />}
            <span>{ratingSummary(p.averageRating, p.reviewCount)}</span>
            <span className="text-ink-600">· {p.variants.length} quy cách</span>
          </a>

          <div className="rise rise-3 mt-6 rounded-[var(--radius-softer)] bg-surface p-5 shadow-[var(--shadow-md)] ring-1 ring-green-500/30 sm:p-7">
            <VariantPicker productName={p.name} variants={p.variants} />
          </div>

          <ul className="rise rise-4 mt-5 grid grid-cols-3 gap-2">
            {ASSURANCES.map((a) => (
              <li key={a.title} className="flex flex-col items-center gap-1.5 rounded-2xl bg-green-100/70 px-2 py-3 text-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {a.icon}
                </svg>
                <span className="text-sm leading-tight font-semibold">{a.title}</span>
                <span className="text-xs leading-tight text-ink-600 max-sm:hidden">{a.body}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-12 space-y-4">
            <Reveal className="flex gap-4 rounded-[var(--radius-soft)] bg-surface p-5 ring-1 ring-green-500/30 sm:p-6">
              {icon(ICON_ORIGIN)}
              <div>
                <dt className="text-lg font-semibold">Nguồn gốc</dt>
                <dd className={`mt-1 text-lg ${placeholderOrigin ? 'text-ink-600 italic' : ''}`}>
                  {p.origin}
                  {placeholderOrigin && <span className="sr-only"> (chủ shop sẽ cập nhật)</span>}
                </dd>
              </div>
            </Reveal>
            <Reveal delay={70} className="flex gap-4 rounded-[var(--radius-soft)] bg-surface p-5 ring-1 ring-green-500/30 sm:p-6">
              {icon(ICON_BENEFIT)}
              <div>
                <dt className="text-lg font-semibold">Công dụng</dt>
                <dd className="mt-1 max-w-[60ch] text-lg whitespace-pre-line">{p.benefits}</dd>
              </div>
            </Reveal>
            <Reveal delay={140} className="flex gap-4 rounded-[var(--radius-soft)] bg-surface p-5 ring-1 ring-green-500/30 sm:p-6">
              {icon(ICON_DESC)}
              <div>
                <dt className="text-lg font-semibold">Mô tả</dt>
                <dd className="mt-1 max-w-[60ch] text-lg whitespace-pre-line">{p.description}</dd>
              </div>
            </Reveal>
          </dl>
        </div>
      </div>

      <section id="danh-gia" aria-labelledby="danh-gia-title" className="mt-24 scroll-mt-24 rounded-[var(--radius-softer)] bg-green-100 px-5 py-12 sm:mt-32 sm:px-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[4fr_8fr] md:gap-14">
          <div>
            <h2 id="danh-gia-title" className="text-[clamp(1.9rem,3.4vw,2.75rem)] leading-tight font-semibold tracking-[-0.02em]">
              Đánh giá
            </h2>
            {p.reviewCount > 0 ? (
              <div className="mt-5 rounded-[var(--radius-soft)] bg-surface p-6 shadow-[var(--shadow-sm)]">
                <p className="text-[clamp(2.75rem,5vw,3.75rem)] leading-none font-semibold tabular-nums">
                  {p.averageRating.toString().replace('.', ',')}
                  <span className="text-xl font-medium text-ink-600">/5</span>
                </p>
                <div className="mt-3">
                  <Stars value={p.averageRating} className="h-6 w-6" />
                </div>
                <p className="mt-2 text-base">{p.reviewCount} đánh giá từ khách đã mua</p>
              </div>
            ) : (
              <p className="mt-4 max-w-[34ch] text-lg">Chưa có đánh giá. Khách đã mua và nhận hàng có thể đánh giá sản phẩm này.</p>
            )}
            <ReviewEntry productId={p.id} />
          </div>

          {p.reviews.length > 0 ? (
            <ul className="space-y-4">
              {p.reviews.map((r, i) => (
                <Reveal as="li" key={r.id} delay={Math.min(i, 4) * 70} className="card-lift rounded-[var(--radius-soft)] bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-honey-400 text-lg font-semibold">
                      {initials(r.userName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-4">
                        <p className="truncate font-semibold">{r.userName}</p>
                        <time dateTime={r.createdAt} className="text-sm text-ink-600">
                          {formatDateVi(r.createdAt)}
                        </time>
                      </div>
                      <Stars value={r.rating} className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <p className="mt-3 text-lg whitespace-pre-line">{r.content}</p>
                </Reveal>
              ))}
            </ul>
          ) : (
            <div className="flex items-center rounded-[var(--radius-soft)] bg-surface p-6 sm:p-8">
              <p className="text-lg">Đánh giá của khách sẽ hiện ở đây, mới nhất ở trên.</p>
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="cung-nhom" className="mt-24 sm:mt-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="cung-nhom" className="text-[clamp(1.75rem,3vw,2.4rem)] leading-tight font-semibold tracking-[-0.02em]">
              Cùng nhóm {p.category.name.toLocaleLowerCase('vi')}
            </h2>
            <Link
              href={`/san-pham?category=${encodeURIComponent(p.category.slug)}`}
              className="inline-flex min-h-11 items-center gap-2 font-medium underline decoration-green-500 decoration-2 underline-offset-[6px] hover:decoration-ink-800"
            >
              Xem tất cả <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 md:grid-cols-4">
            {related.map((x, i) => (
              <Reveal as="li" key={x.id} delay={i * 80}>
                <ProductCard
                  slug={x.slug}
                  name={x.name}
                  priceFrom={priceFrom(x.variants) ?? x.minPriceVnd}
                  image={x.images[0]}
                  multipleVariants={hasPriceRange(x.variants)}
                  outOfStock={isSoldOut(x.variants)}
                />
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
