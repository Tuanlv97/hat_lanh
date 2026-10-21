import Image from 'next/image';
import Link from 'next/link';
import { HomeStage, type StageCategory } from '@/components/home/HomeStage';
import { PriceSheet } from '@/components/home/PriceSheet';
import { Reveal } from '@/components/Reveal';
import { StateMessage } from '@/components/StateMessage';
import { getCategories, getProducts } from '@/lib/catalog-server';
import { PLATES } from '@/lib/plates';
import { SHIPPING_NOTE, SHOP_BLURB, SHOP_TAGLINE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const BENEFITS = [
  { title: 'Chọn kỹ từng mẻ', body: 'Hạt và trà được tuyển chọn cho bữa ăn thanh đạm.', icon: <path d="M5 21c0-9 5-15 14-16-1 9-6 15-14 16ZM5 21c2-5 5-8 9-10" /> },
  { title: 'Giá rõ theo quy cách', body: 'Mỗi sản phẩm có nhiều cỡ gói, giá hiện ngay, không bất ngờ.', icon: <path d="M4 7h16M4 12h16M4 17h10" /> },
  { title: 'Đặt dễ, theo dõi được', body: 'Tra cứu đơn bằng mã bất cứ lúc nào, đặt hàng nhanh gọn.', icon: <path d="M3 7l9-4 9 4v10l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v10" /> },
];

const STEPS = [
  { title: 'Chọn sản phẩm', body: 'Xem nhóm hàng, chọn quy cách phù hợp và thêm vào giỏ.' },
  { title: 'Điền thông tin', body: 'Nhập tên, số điện thoại và địa chỉ nhận hàng.' },
  { title: 'Nhận xác nhận', body: 'Cửa hàng liên hệ báo phí vận chuyển và xác nhận đơn.' },
];

export default async function HomePage() {
  const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
  const products = prods.ok ? prods.data : [];
  const categories: StageCategory[] = cats.ok
    ? cats.data
        .map((c) => ({ slug: c.slug, name: c.name, products: products.filter((p) => p.category.slug === c.slug) }))
        .filter((c) => c.products.length > 0)
    : [];
  const loadFailed = !cats.ok || !prods.ok;
  const hasPriceSheet = categories.length > 0;
  const mume = PLATES.find((p) => p.key === 'mo') ?? PLATES[0];

  const hero = (
    <div className="flex flex-col justify-center pt-2 md:min-h-[calc(100svh-6.5rem)] md:pt-0">
      <p className="rise inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-honey-400" />
        {SHOP_TAGLINE}
      </p>
      <h1 className="rise rise-1 mt-5 text-[clamp(2.6rem,5.6vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
        Hạt lành, bữa cơm lành
      </h1>
      <p className="rise rise-2 mt-6 max-w-[40ch] text-lg leading-relaxed sm:text-xl">{SHOP_BLURB}</p>
      <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
        <Link href="/san-pham" className="btn btn-primary btn-lg">
          Xem sản phẩm
          <span aria-hidden="true">→</span>
        </Link>
        {hasPriceSheet && (
          <Link href="#bang-gia" className="btn btn-honey btn-lg">
            Xem bảng giá
          </Link>
        )}
      </div>
      {products.length > 0 && (
        <p className="rise rise-4 mt-10 text-base text-ink-600">
          {products.length} sản phẩm trong {categories.length} nhóm, giá theo từng quy cách.
        </p>
      )}
    </div>
  );

  return (
    <>
      <section aria-label="Giới thiệu" className="pt-4 md:pt-6">
        <HomeStage hero={hero} categories={categories} />
        {loadFailed && (
          <div className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
            <StateMessage
              title="Chưa tải được danh sách sản phẩm"
              body="Kết nối tới cửa hàng đang chậm. Bạn thử tải lại trang sau ít phút nhé."
              action={{ href: '/', label: 'Tải lại trang' }}
            />
          </div>
        )}
      </section>

      <section aria-label="Vì sao chọn Hạt Lành" className="mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <li key={b.title}>
              <Reveal delay={i * 90} className="card-lift flex h-full gap-4 rounded-[var(--radius-softer)] bg-surface p-6 ring-1 ring-green-500/30">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {b.icon}
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{b.title}</h2>
                  <p className="mt-1 text-base text-ink-600">{b.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {hasPriceSheet && (
        <section id="bang-gia" aria-labelledby="bang-gia-title" className="mt-20 scroll-mt-20 bg-green-100 py-20 sm:mt-28 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-14 lg:px-8">
            <div className="md:sticky md:top-24 md:self-start">
              <Reveal>
                <h2 id="bang-gia-title" className="text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
                  Bảng giá
                </h2>
              </Reveal>
              <Reveal delay={80}>
                <p className="mt-5 max-w-[38ch] text-lg">
                  Giá theo từng quy cách. {SHIPPING_NOTE}.
                </p>
              </Reveal>
              <Reveal delay={160} as="figure" className="mt-10 hidden md:block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-softer)] bg-surface">
                  <Image src={mume.src} alt={mume.alt} fill sizes="34vw" className="object-contain p-6" />
                </div>
                <figcaption className="mt-3 text-base">{mume.caption}</figcaption>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <PriceSheet categories={categories} />
            </Reveal>
          </div>
        </section>
      )}

      <section aria-labelledby="cach-dat" className="mx-auto mt-24 max-w-6xl px-4 sm:mt-32 sm:px-6 lg:px-8">
        <Reveal>
          <h2 id="cach-dat" className="text-[clamp(1.9rem,3.6vw,3rem)] leading-tight font-semibold tracking-[-0.025em]">
            Đặt hàng chỉ 3 bước
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((st, i) => (
            <li key={st.title}>
              <Reveal delay={i * 100} className="h-full rounded-[var(--radius-softer)] bg-green-100 p-7">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-honey-400 text-lg font-semibold">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold">{st.title}</h3>
                <p className="mt-2 text-base text-ink-600">{st.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal className="relative mt-12 overflow-hidden rounded-[var(--radius-softer)] bg-ink-800 px-6 py-12 text-bg sm:px-12 sm:py-16">
          <span aria-hidden="true" className="float-slow pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-honey-400/25" />
          <span aria-hidden="true" className="float-slower pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-green-500/25" />
          <div className="relative max-w-xl">
            <h2 className="text-[clamp(1.75rem,3.2vw,2.6rem)] leading-tight font-semibold tracking-[-0.02em]">Sẵn sàng cho bữa cơm lành?</h2>
            <p className="mt-3 text-lg text-bg/85">Chọn sản phẩm, thêm vào giỏ và đặt hàng. Cửa hàng sẽ liên hệ xác nhận đơn.</p>
            <Link href="/san-pham" className="btn btn-honey btn-lg mt-7">
              Chọn sản phẩm ngay
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </section>

      <div className="mx-auto mt-24 max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="max-w-3xl text-base leading-relaxed text-ink-800">
          Tranh thực vật (phạm vi công cộng, qua Wikimedia Commons):{' '}
          {PLATES.map((p, i) => (
            <span key={p.key}>
              <a href={p.credit.url} className="underline underline-offset-2 hover:text-green-700" rel="noopener noreferrer" target="_blank">
                {p.caption}
              </a>{' '}
              — {p.credit.author}
              {i < PLATES.length - 1 ? '; ' : '.'}
            </span>
          ))}
        </p>
      </div>
    </>
  );
}
