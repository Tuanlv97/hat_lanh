// Server components only: reads API_URL through api().
import { cache } from 'react';
import { api, ApiError } from './api';
import type { Category, ProductDetail, ProductSummary } from './catalog';

/** A fetch that never throws: pages render a friendly message on `error` instead of crashing. */
export type Loaded<T> = { ok: true; data: T } | { ok: false; notFound: boolean };

async function load<T>(path: string): Promise<Loaded<T>> {
  try {
    // Stock changes with every order, so catalog reads are never cached.
    const data = await api<T>(path, { cache: 'no-store' });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: false, notFound: true };
    console.error(`[catalog] GET ${path} failed:`, err instanceof Error ? err.message : err);
    return { ok: false, notFound: false };
  }
}

export const getCategories = cache(() => load<Category[]>('/categories'));

export function getProducts(params: { category?: string; q?: string } = {}) {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  const qs = search.toString();
  return load<ProductSummary[]>(`/products${qs ? `?${qs}` : ''}`);
}

/** Deduplicated per request so generateMetadata and the page share one API call. */
export const getProduct = cache((slug: string) => load<ProductDetail>(`/products/${encodeURIComponent(slug)}`));
