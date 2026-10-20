'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** Delay in ms, for staggering siblings (heading, then text, then picture). */
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'figure';
};

/**
 * Rises into place once when it scrolls into view. Server HTML is fully visible: the element is only
 * hidden after hydration, and only if it is still below the fold, so nothing depends on the script.
 * Reduced motion: no travel, no hiding.
 */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.dataset.reveal = 'hidden';
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.style.transitionDelay = `${delay}ms`;
          el.dataset.reveal = 'shown';
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref as never} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
