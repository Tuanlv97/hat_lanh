import type { Metadata } from 'next';
import Link from 'next/link';
import { SHOP_BLURB, SHOP_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Về chúng tôi',
  description: SHOP_BLURB,
  alternates: { canonical: '/ve-chung-toi' },
};

/** Placeholder copy the owner replaces: every `[Điền …]` marker must be edited before launch. */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">Về chúng tôi</h1>
      <p className="mt-4 max-w-[48ch] text-lg">{SHOP_BLURB}</p>

      <div className="mt-12 max-w-[60ch] space-y-10">
        <section aria-labelledby="gioi-thieu">
          <h2 id="gioi-thieu" className="text-xl font-semibold">
            Giới thiệu {SHOP_NAME}
          </h2>
          <p className="mt-2 text-lg text-ink-600 italic">[Điền giới thiệu shop]</p>
        </section>
        <section aria-labelledby="cau-chuyen">
          <h2 id="cau-chuyen" className="text-xl font-semibold">
            Câu chuyện của shop
          </h2>
          <p className="mt-2 text-lg text-ink-600 italic">[Điền câu chuyện và lý do chọn thực phẩm chay thực dưỡng]</p>
        </section>
        <section aria-labelledby="lien-he">
          <h2 id="lien-he" className="text-xl font-semibold">
            Liên hệ
          </h2>
          <p className="mt-2 text-lg text-ink-600 italic">[Điền số điện thoại, Zalo và địa chỉ shop]</p>
        </section>
      </div>

      <Link href="/san-pham" className="mt-12 inline-flex h-12 items-center rounded-full bg-primary px-7 font-medium text-bg transition-opacity duration-200 hover:opacity-90">
        Xem sản phẩm
      </Link>
    </div>
  );
}
