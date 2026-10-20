import { isSafeSlug } from './catalog';

export type Topic = { id: string; slug: string; name: string };

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  topic: Topic | null;
  publishedAt: string;
};

export type PostList = { items: PostSummary[]; total: number; page: number; pageSize: number };

export type PostProduct = { id: string; name: string; slug: string; image: string | null; minPriceVnd: number };

export type PostDetail = PostSummary & { html: string; products: PostProduct[]; commentCount: number };

export type PostComment = { id: string; content: string; status: 'VISIBLE' | 'PENDING' | 'HIDDEN'; createdAt: string; authorName: string };

export const COMMENT_MAX = 1000;
export const POSTS_PER_PAGE = 9;

/** Blog list URL for a topic and page; omits defaults so the canonical list stays `/blog`. */
export function blogHref(topic: string, page = 1): string {
  const p = new URLSearchParams();
  if (topic) p.set('topic', topic);
  if (page > 1) p.set('page', String(page));
  const s = p.toString();
  return s ? `/blog?${s}` : '/blog';
}

/** Positive integer page from a query value; anything else is page 1. */
export function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 10_000 ? n : 1;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

export function isSafePostSlug(slug: string): boolean {
  return isSafeSlug(slug);
}

/** Client-side check mirroring the API (1–1000 characters after trimming). */
export function validateComment(raw: string): string | null {
  const t = raw.trim();
  if (!t) return 'Vui lòng nhập nội dung';
  if (t.length > COMMENT_MAX) return `Nội dung tối đa ${COMMENT_MAX} ký tự`;
  return null;
}
