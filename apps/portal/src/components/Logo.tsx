import Link from 'next/link';
import { SHOP_NAME } from '@/lib/site';

/** A single grain of rice on a green seed: the same mark as the product placeholders. */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="20" fill="var(--green-500)" />
      <ellipse cx="20" cy="20" rx="6.5" ry="12" fill="var(--honey-400)" transform="rotate(-20 20 20)" />
      <path d="M17.2 11.5c1.6 5.2 2.2 11 1.5 17" stroke="var(--ink-800)" strokeOpacity=".35" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 pr-2 text-ink-800" aria-label={`${SHOP_NAME} — trang chủ`}>
      <LogoMark />
      <span className="text-xl font-semibold tracking-[-0.02em]">{SHOP_NAME}</span>
    </Link>
  );
}
