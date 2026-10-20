import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommentSection } from '@/components/blog/CommentSection';
import { ProductCard } from '@/components/ProductCard';
import { StateMessage } from '@/components/StateMessage';
import { assetUrl } from '@/lib/api';
import { blogHref } from '@/lib/blog';
import { getPost } from '@/lib/blog-server';
import { formatDateVi } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPost(slug);
  if (!res.ok) return { title: res.notFound ? 'Không tìm thấy bài viết' : 'Blog' };
  const p = res.data;
  const url = `/blog/${encodeURIComponent(p.slug)}`;
  return {
    title: p.title,
    description: p.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: p.title,
      description: p.excerpt,
      url,
      publishedTime: p.publishedAt,
      ...(p.coverImage ? { images: [{ url: assetUrl(p.coverImage), alt: p.title }] } : {}),
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const res = await getPost(slug);
  if (!res.ok) {
    if (res.notFound) notFound();
    return (
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:px-8">
        <StateMessage role="alert" title="Chưa tải được bài viết" body="Kết nối tới cửa hàng đang chậm. Bạn thử tải lại trang sau ít phút nhé." action={{ href: `/blog/${encodeURIComponent(slug)}`, label: 'Tải lại' }} />
      </div>
    );
  }
  const p = res.data;

  return (
    <article className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <nav aria-label="Đường dẫn" className="text-base">
        <ol className="flex flex-wrap items-center gap-x-2 text-ink-600">
          <li>
            <Link href="/blog" className="hover:text-ink-800 hover:underline underline-offset-4">
              Blog
            </Link>
          </li>
          {p.topic && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={blogHref(p.topic.slug)} className="hover:text-ink-800 hover:underline underline-offset-4">
                  {p.topic.name}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <header className="mt-6 max-w-[60ch]">
        <h1 className="text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance">{p.title}</h1>
        <p className="mt-3 text-base text-ink-600">
          <time dateTime={p.publishedAt}>{formatDateVi(p.publishedAt)}</time>
        </p>
      </header>

      {p.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element -- API image, size unknown
        <img src={assetUrl(p.coverImage)} alt="" className="mt-8 max-h-[28rem] w-full rounded-[var(--radius-softer)] object-cover" />
      )}

      {/* Safe only because the API sanitizes the html when the post is saved. */}
      <div className="post-body mt-8 max-w-[60ch]" dangerouslySetInnerHTML={{ __html: p.html }} />

      {p.products.length > 0 && (
        <section aria-labelledby="sp-lien-quan" className="mt-20">
          <h2 id="sp-lien-quan" className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em]">
            Sản phẩm trong bài
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-4">
            {p.products.map((x) => (
              <li key={x.id}>
                <ProductCard slug={x.slug} name={x.name} priceFrom={x.minPriceVnd} image={x.image} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CommentSection slug={p.slug} path={`/blog/${encodeURIComponent(p.slug)}`} />
    </article>
  );
}
