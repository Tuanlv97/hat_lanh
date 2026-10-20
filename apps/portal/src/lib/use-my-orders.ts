'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { CustomerOrder } from './orders';

export type MyOrdersState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; orders: CustomerOrder[] };

/** `GET /me/orders` for the signed-in customer. A 401 clears the session, and RequireAuth then sends them to login. */
export function useMyOrders(enabled = true) {
  const [state, setState] = useState<MyOrdersState>({ status: 'loading' });
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setState({ status: 'loading' });
    try {
      const orders = await api<CustomerOrder[]>('/me/orders', { cache: 'no-store' });
      if (mine === seq.current) setState({ status: 'ready', orders: Array.isArray(orders) ? orders : [] });
    } catch {
      if (mine === seq.current) setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { state, reload };
}
