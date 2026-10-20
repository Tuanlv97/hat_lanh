'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { resolveCartLines, type CartLine, type ResolvedCart } from './cart';
import type { ProductSummary } from './catalog';

export type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; products: ProductSummary[] };

/**
 * Resolves the browser cart against `GET /products` (public list: active products, their active variants, price and stock).
 * One request for the whole small catalog; `reload()` re-checks stock (e.g. after the server rejected an order).
 */
export function useCartCatalog(lines: CartLine[], enabled: boolean) {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }));
    try {
      const products = await api<ProductSummary[]>('/products', { cache: 'no-store' });
      if (mine === seq.current) setState({ status: 'ready', products: Array.isArray(products) ? products : [] });
    } catch {
      if (mine === seq.current) setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const resolved: ResolvedCart | null = useMemo(
    () => (state.status === 'ready' ? resolveCartLines(lines, state.products) : null),
    [lines, state],
  );

  return { state, resolved, reload };
}
