import Link from 'next/link';
import { NAV_LINKS, SHIPPING_NOTE, SHOP_BLURB, SHOP_NAME } from '@/lib/site';
import { FooterAccountLinks } from './FooterAccountLinks';
import { LogoMark } from './Logo';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 overflow-hidden rounded-t-[2.5rem] bg-green-100 text-ink-800 sm:mt-32 sm:rounded-t-[3.5rem]">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-md">
            <p className="text-lg leading-relaxed">{SHOP_BLURB}</p>
            <p className="mt-6 inline-flex rounded-full bg-honey-400 px-4 py-2 text-sm font-medium">{SHIPPING_NOTE}</p>
          </div>

          <nav aria-label="Liên kết cuối trang">
            <h2 className="text-base font-semibold">Cửa hàng</h2>
            <ul className="mt-3 space-y-1">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center transition-transform duration-200 hover:translate-x-1 hover:underline underline-offset-4">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-base font-semibold">Tài khoản</h2>
            <FooterAccountLinks />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 sm:mt-24 sm:flex-row sm:items-end sm:justify-between">
          <p className="flex items-center gap-4 text-[clamp(2.75rem,9vw,6.5rem)] leading-none font-semibold tracking-[-0.04em]">
            <LogoMark className="h-[0.8em] w-[0.8em] shrink-0" />
            {SHOP_NAME}
          </p>
          <p className="text-sm text-ink-600">© {year} {SHOP_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
