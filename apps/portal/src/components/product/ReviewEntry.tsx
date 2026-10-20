'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { CustomerOrder, ProductReview } from '@/lib/orders';

type Entry = { kind: 'none' } | { kind: 'write'; href: string } | { kind: 'pending' };

/**
 * "Viết đánh giá" on the product page, shown only to a signed-in customer who has this product in a
 * COMPLETED order and has not reviewed it yet. The form itself lives on the order page.
 */
export function ReviewEntry({ productId }: { productId: string }) {
  const { user, ready } = useAuth();
  const [entry, setEntry] = useState<Entry>({ kind: 'none' });

  useEffect(() => {
    setEntry({ kind: 'none' });
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const orders = await api<CustomerOrder[]>('/me/orders', { cache: 'no-store' });
        const order = Array.isArray(orders)
          ? orders.find((o) => o.status === 'COMPLETED' && o.items.some((it) => it.productId === productId))
          : undefined;
        if (!order) return;
        const reviews = await api<ProductReview[]>(`/products/${encodeURIComponent(productId)}/reviews`, { cache: 'no-store' });
        const mine = Array.isArray(reviews) ? reviews.find((r) => r.mine) : undefined;
        if (cancelled) return;
        if (!mine) {
          setEntry({ kind: 'write', href: `/tai-khoan/don-hang/${encodeURIComponent(order.code)}#danh-gia-${encodeURIComponent(productId)}` });
        } else if (mine.status !== 'VISIBLE') setEntry({ kind: 'pending' });
      } catch {
        /* the entry point is optional: on any failure simply show nothing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, productId]);

  if (entry.kind === 'write') {
    return (
      <Link
        href={entry.href}
        className="mt-6 inline-flex h-12 items-center rounded-full bg-ink-800 px-6 font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
      >
        Viết đánh giá
      </Link>
    );
  }
  if (entry.kind === 'pending') {
    return <p className="mt-6 max-w-[34ch] text-base text-ink-600">Đánh giá của bạn đang chờ duyệt.</p>;
  }
  return null;
}
