import Image from 'next/image';
import Link from 'next/link';
import { GrainField } from '@/components/home/GrainField';
import { HomeStage, type StageCategory } from '@/components/home/HomeStage';
import { PriceSheet } from '@/components/home/PriceSheet';
import { Reveal } from '@/components/Reveal';
import { StateMessage } from '@/components/StateMessage';
import { getCategories, getProducts } from '@/lib/catalog-server';
import { PLATES } from '@/lib/plates';
import { SHIPPING_NOTE, SHOP_BLURB } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
  const products = prods.ok ? prods.data : [];
  const categories: StageCategory[] = cats.ok
    ? cats.data
        .map((c) => ({ slug: c.slug, name: c.name, products: products.filter((p) => p.category.slug === c.slug) }))
        .filter((c) => c.products.length > 0)
    : [];
  const loadFailed = !cats.ok || !prods.ok;
  const mume = PLATES.find((p) => p.key === 'mo') ?? PLATES[0];

  const hero = (
    <div className="flex flex-col justify-center pt-2 md:min-h-[calc(100svh-6.5rem)] md:pt-0">
      <h1 className="text-[clamp(2.6rem,5.6vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
        Hạt lành, bữa cơm lành
      </h1>
      <p className="mt-6 max-w-[40ch] text-lg leading-relaxed sm:text-xl">{SHOP_BLURB}</p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/san-pham"
          className="inline-flex h-13 items-center rounded-full bg-ink-800 px-5 text-lg sm:px-8 font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          Xem sản phẩm
        </Link>
        <Link
          href="#bang-gia"
          className="inline-flex h-13 items-center rounded-full bg-honey-400 px-5 text-lg sm:px-7 font-medium transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.98]"
        >
          Xem bảng giá
        </Link>
      </div>
      {products.length > 0 && (
        <p className="mt-10 text-base text-ink-600">
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

      {categories.length > 0 && (
        <section id="bang-gia" aria-labelledby="bang-gia-title" className="mt-32 scroll-mt-20 bg-green-100 py-20 sm:mt-44 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-14 lg:px-8">
            <div className="md:sticky md:top-24 md:self-start">
              <Reveal>
                <h2 id="bang-gia-title" className="text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
                  Bảng giá
                </h2>
              </Reveal>
              <Reveal delay={80}>
                <p className="mt-5 max-w-[38ch] text-lg">
                  Giá niêm yết theo từng quy cách, mua bao nhiêu tính bấy nhiêu. {SHIPPING_NOTE}.
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

      <section aria-labelledby="nau-gao" className="mx-auto mt-32 grid max-w-6xl items-center gap-12 px-4 sm:mt-44 sm:px-6 md:grid-cols-2 md:gap-16 lg:px-8">
        <div>
          <Reveal>
            <h2 id="nau-gao" className="text-[clamp(1.9rem,3.4vw,2.75rem)] leading-tight font-semibold tracking-[-0.02em] text-balance">
              Nấu gạo lứt cho cơm mềm
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-4 max-w-[46ch] text-lg">Gạo lứt còn lớp cám nên cần nhiều nước và thời gian hơn gạo trắng. Cách nấu quen thuộc ở nhà:</p>
          </Reveal>
          <ol className="mt-8 space-y-5 text-lg">
            {[
              'Vo nhẹ một lần cho sạch bụi, không chà mạnh để giữ lớp cám.',
              'Ngâm 4–8 tiếng, hoặc qua đêm, với nước sạch.',
              'Nấu với lượng nước gấp 1,5 đến 2 lần gạo, thêm một nhúm muối.',
              'Cơm chín thì ủ thêm 10–15 phút rồi mới xới.',
            ].map((step, i) => (
              <Reveal key={step} as="li" delay={140 + i * 70} className="flex gap-4">
                <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-honey-400 text-base font-semibold tabular-nums">
                  {i + 1}
                </span>
                <span>{step}</span>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={420}>
            <p className="mt-8 max-w-[46ch] text-lg">
              Nồi áp suất rút còn khoảng 30 phút. Gạo lứt đỏ, đen và trắng đều nấu được theo cách này.
            </p>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <GrainField />
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
