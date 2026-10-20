// Server components only: reads API_URL through api().
import { cache } from 'react';
import { api, ApiError } from './api';
import { isSafePostSlug, POSTS_PER_PAGE, type PostDetail, type PostList, type Topic } from './blog';
import type { Loaded } from './catalog-server';

async function load<T>(path: string): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await api<T>(path, { cache: 'no-store' }) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: false, notFound: true };
    console.error(`[blog] GET ${path} failed:`, err instanceof Error ? err.message : err);
    return { ok: false, notFound: false };
  }
}

export const getTopics = cache(() => load<Topic[]>('/topics'));

export function getPosts(params: { topic?: string; page?: number }) {
  const s = new URLSearchParams({ pageSize: String(POSTS_PER_PAGE) });
  if (params.topic) s.set('topic', params.topic);
  if (params.page && params.page > 1) s.set('page', String(params.page));
  return load<PostList>(`/posts?${s}`);
}

export const getPost = cache(
  (slug: string): Promise<Loaded<PostDetail>> =>
    isSafePostSlug(slug) ? load<PostDetail>(`/posts/${encodeURIComponent(slug)}`) : Promise.resolve({ ok: false, notFound: true }),
);
