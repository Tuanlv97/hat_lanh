import type { Metadata } from 'next';
import Link from 'next/link';
import { StateMessage } from '@/components/StateMessage';
import { assetUrl } from '@/lib/api';
import { blogHref, parsePage, totalPages } from '@/lib/blog';
import { getPosts, getTopics } from '@/lib/blog-server';
import { formatDateVi } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 100) ?? '';
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const topic = one((await searchParams).topic);
  const topics = topic ? await getTopics() : null;
  const name = topics?.ok ? topics.data.find((t) => t.slug === topic)?.name : undefined;
  return {
    title: name ? `${name} · Blog` : 'Blog',
    description: 'Chia sẻ về ăn chay thực dưỡng, cách nấu gạo lứt và những bữa cơm thanh đạm mỗi ngày.',
    alternates: { canonical: '/blog' },
  };
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const topic = one(sp.topic);
  const page = parsePage(one(sp.page));
  const [topicsRes, postsRes] = await Promise.all([getTopics(), getPosts({ topic, page })]);
  const topics = topicsRes.ok ? topicsRes.data : [];
  const active = topics.find((t) => t.slug === topic);
  const pages = postsRes.ok ? totalPages(postsRes.data.total, postsRes.data.pageSize) : 1;

  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-5 text-base transition-colors duration-200 ${
      on ? 'bg-ink-800 font-medium text-bg' : 'bg-green-100 text-ink-800 hover:bg-green-500'
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">{active ? active.name : 'Blog'}</h1>
      <p className="mt-4 max-w-[48ch] text-lg">Những điều nhỏ về bữa ăn chay thực dưỡng: cách nấu, cách chọn và cách ăn cho nhẹ bụng.</p>

      {topics.length > 0 && (
        <nav aria-label="Lọc theo chủ đề" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href={blogHref('')} className={chip(!active)} aria-current={!active ? 'page' : undefined}>
                Tất cả
              </Link>
            </li>
            {topics.map((t) => (
              <li key={t.slug}>
                <Link href={blogHref(t.slug)} className={chip(active?.slug === t.slug)} aria-current={active?.slug === t.slug ? 'page' : undefined}>
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <section aria-label="Danh sách bài viết" className="mt-10 sm:mt-14">
        {!postsRes.ok ? (
          <StateMessage role="alert" title="Chưa tải được bài viết" body="Kết nối tới cửa hàng đang chậm. Bạn thử tải lại trang sau ít phút nhé." action={{ href: blogHref(topic, page), label: 'Tải lại' }} />
        ) : postsRes.data.items.length === 0 ? (
          <StateMessage title="Chưa có bài viết" body="Mục này đang được chuẩn bị, bạn quay lại sau nhé." action={{ href: '/blog', label: 'Xem tất cả bài viết' }} />
        ) : (
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {postsRes.data.items.map((p) => (
              <li key={p.id}>
                <Link href={`/blog/${encodeURIComponent(p.slug)}`} className="group flex flex-col gap-4 rounded-[var(--radius-softer)] p-2 -m-2 transition-colors duration-200 hover:bg-green-100/60">
                  <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-soft)] bg-green-100">
                    {p.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element -- API images, sizes unknown
                      <img src={assetUrl(p.coverImage)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100" />
                    )}
                  </div>
                  <div className="px-1">
                    <p className="text-base text-ink-600">
                      {p.topic ? `${p.topic.name} · ` : ''}
                      <time dateTime={p.publishedAt}>{formatDateVi(p.publishedAt)}</time>
                    </p>
                    <h2 className="mt-1 text-xl leading-snug font-semibold text-balance">{p.title}</h2>
                    <p className="mt-2 text-base">{p.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pages > 1 && (
        <nav aria-label="Phân trang" className="mt-14 flex items-center justify-between gap-4">
          {page > 1 ? <Link href={blogHref(topic, page - 1)} className={chip(false)}>Trang trước</Link> : <span />}
          <span className="text-base text-ink-600">Trang {page}/{pages}</span>
          {page < pages ? <Link href={blogHref(topic, page + 1)} className={chip(false)}>Trang sau</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
