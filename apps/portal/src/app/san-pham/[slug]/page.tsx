import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gallery } from '@/components/product/Gallery';
import { Stars } from '@/components/product/Stars';
import { VariantPicker } from '@/components/product/VariantPicker';
import { Reveal } from '@/components/Reveal';
import { StateMessage } from '@/components/StateMessage';
import { assetUrl } from '@/lib/api';
import { formatDateVi, isOriginPlaceholder, ratingSummary } from '@/lib/catalog';
import { getProduct } from '@/lib/catalog-server';

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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <nav aria-label="Đường dẫn" className="text-base">
        <ol className="flex flex-wrap items-center gap-x-2 text-ink-600">
          <li>
            <Link href="/san-pham" className="hover:text-ink-800 hover:underline underline-offset-4">
              Sản phẩm
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/san-pham?category=${encodeURIComponent(p.category.slug)}`} className="hover:text-ink-800 hover:underline underline-offset-4">
              {p.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
        {/* The fixed half: the product stays in view while its details scroll. */}
        <div className="md:sticky md:top-24 md:self-start">
          <Gallery images={p.images} name={p.name} fallback={`/placeholder/${p.slug}.svg`} />
        </div>

        <div>
          <h1 className="text-[clamp(2.25rem,4.6vw,3.6rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance">{p.name}</h1>
          <p className="mt-3 text-lg">
            {p.category.name} · {p.variants.length} quy cách
          </p>
          <a href="#danh-gia" className="mt-1 inline-flex min-h-10 items-center gap-2 text-base hover:underline underline-offset-4">
            {p.reviewCount > 0 && <Stars value={p.averageRating} />}
            <span>{ratingSummary(p.averageRating, p.reviewCount)}</span>
          </a>

          <div className="mt-6">
            <VariantPicker productName={p.name} variants={p.variants} />
          </div>

          <dl className="mt-14 space-y-10">
            <Reveal>
              <dt className="text-xl font-semibold">Nguồn gốc</dt>
              <dd className={`mt-2 text-lg ${placeholderOrigin ? 'text-ink-600 italic' : ''}`}>
                {p.origin}
                {placeholderOrigin && <span className="sr-only"> (chủ shop sẽ cập nhật)</span>}
              </dd>
            </Reveal>
            <Reveal delay={70}>
              <dt className="text-xl font-semibold">Công dụng</dt>
              <dd className="mt-2 max-w-[60ch] text-lg whitespace-pre-line">{p.benefits}</dd>
            </Reveal>
            <Reveal delay={140}>
              <dt className="text-xl font-semibold">Mô tả</dt>
              <dd className="mt-2 max-w-[60ch] text-lg whitespace-pre-line">{p.description}</dd>
            </Reveal>
          </dl>
        </div>
      </div>

      <section id="danh-gia" aria-labelledby="danh-gia-title" className="mt-28 scroll-mt-24 rounded-[var(--radius-softer)] bg-green-100 px-5 py-12 sm:mt-40 sm:px-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[4fr_8fr] md:gap-14">
          <div>
            <h2 id="danh-gia-title" className="text-[clamp(1.9rem,3.4vw,2.75rem)] leading-tight font-semibold tracking-[-0.02em]">
              Đánh giá
            </h2>
            {p.reviewCount > 0 ? (
              <div className="mt-4">
                <p className="text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-semibold tabular-nums">
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
          </div>

          {p.reviews.length > 0 ? (
            <ul className="space-y-4">
              {p.reviews.map((r, i) => (
                <Reveal as="li" key={r.id} delay={Math.min(i, 4) * 70} className="rounded-[var(--radius-soft)] bg-surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <p className="font-semibold">{r.userName}</p>
                    <time dateTime={r.createdAt} className="text-base text-ink-600">
                      {formatDateVi(r.createdAt)}
                    </time>
                  </div>
                  <div className="mt-1">
                    <Stars value={r.rating} className="h-4.5 w-4.5" />
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
    </div>
  );
}
