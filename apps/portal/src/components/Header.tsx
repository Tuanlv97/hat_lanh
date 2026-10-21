'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCartCount } from '@/lib/cart';
import { NAV_LINKS } from '@/lib/site';
import { Logo } from './Logo';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function CartLink({ count }: { count: number }) {
  const [bump, setBump] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 450);
      prev.current = count;
      return () => window.clearTimeout(t);
    }
    prev.current = count;
  }, [count]);
  const label = count > 0 ? `Giỏ hàng, ${count} sản phẩm` : 'Giỏ hàng, chưa có sản phẩm';
  return (
    <Link
      href="/gio-hang"
      aria-label={label}
      className="btn btn-soft relative h-11 min-h-11 gap-2 px-4 text-sm"
    >
      <BagIcon />
      <span className="hidden sm:inline">Giỏ hàng</span>
      <span
        aria-hidden="true"
        className={`${bump ? 'bump' : ''} min-w-6 rounded-full px-1.5 text-center text-xs font-semibold leading-6 tabular-nums ${count > 0 ? 'bg-honey-400 text-ink-800' : 'bg-surface text-ink-600'}`}
      >
        {count}
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname() ?? '/';
  const { user, ready, logout } = useAuth();
  const count = useCartCount();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const linkClass = (href: string) =>
    `nav-link px-4 py-2.5 text-[0.95rem] transition-colors duration-200 ${
      isActive(pathname, href) ? 'font-semibold text-ink-800' : 'text-ink-800/85 hover:text-ink-800'
    }`;

  return (
    <header className="site-header sticky top-0 z-40" data-scrolled={scrolled}>
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Chính" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass(l.href)} aria-current={isActive(pathname, l.href) ? 'page' : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <CartLink count={count} />

          <div className={`hidden items-center gap-1 md:flex ${ready ? '' : 'invisible'}`}>
            {user ? (
              <>
                <span className="hidden max-w-36 truncate px-2 text-sm text-ink-600 lg:inline" title={user.name}>
                  {user.name}
                </span>
                <Link
                  href="/tai-khoan/don-hang"
                  aria-current={isActive(pathname, '/tai-khoan/don-hang') ? 'page' : undefined}
                  className={`inline-flex h-11 items-center rounded-full px-3 text-sm font-medium transition-colors duration-200 ${isActive(pathname, '/tai-khoan/don-hang') ? 'bg-green-100' : 'hover:bg-green-100'}`}
                >
                  Đơn hàng của tôi
                </Link>
                <button type="button" onClick={logout} className="h-11 cursor-pointer rounded-full px-3 text-sm text-ink-600 transition-colors duration-200 hover:bg-green-100 hover:text-ink-800">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link href="/dang-nhap" className="btn btn-primary h-11 min-h-11 px-5 text-sm">
                Đăng nhập
              </Link>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-800 transition-colors duration-200 hover:bg-green-100 md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!open} className="menu-in md:hidden">
        <nav aria-label="Menu di động" className="mx-4 mb-4 rounded-[var(--radius-softer)] bg-green-100 p-3 shadow-[var(--shadow-md)]">
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(pathname, l.href) ? 'page' : undefined}
                  className={`flex min-h-12 items-center rounded-2xl px-4 text-lg ${isActive(pathname, l.href) ? 'bg-surface font-medium' : 'hover:bg-surface'}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 px-1 pb-1">
            {user ? (
              <>
                <p className="w-full px-3 text-base text-ink-600">
                  Đang đăng nhập: <span className="font-medium text-ink-800">{user.name}</span>
                </p>
                <Link
                  href="/tai-khoan/don-hang"
                  aria-current={isActive(pathname, '/tai-khoan/don-hang') ? 'page' : undefined}
                  className="flex min-h-11 items-center rounded-full bg-surface px-4 font-medium"
                >
                  Đơn hàng của tôi
                </Link>
                <button type="button" onClick={logout} className="min-h-11 cursor-pointer rounded-full px-4 text-ink-800 hover:bg-surface">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link href="/dang-nhap" className="flex min-h-11 items-center rounded-full bg-primary px-5 font-medium text-bg">
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
