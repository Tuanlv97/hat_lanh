'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { COMMENT_MAX, validateComment, type PostComment } from '@/lib/blog';
import { formatDateVi } from '@/lib/catalog';
import { loginHref } from '@/lib/next-path';
import { FieldMessages, fieldClass, describedBy } from '@/components/form';

/** Comments for one post. Reading is public; writing needs a signed-in account. */
export function CommentSection({ slug, path }: { slug: string; path: string }) {
  const { user, ready } = useAuth();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const base = `/posts/${encodeURIComponent(slug)}/comments`;

  const load = useCallback(async () => {
    try {
      setComments(await api<PostComment[]>(base, { cache: 'no-store' }));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [base]);

  // Re-read once the session is known: the author also sees their own comments awaiting approval.
  useEffect(() => {
    if (ready) void load();
  }, [ready, user?.id, load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateComment(content);
    setError(problem ?? undefined);
    if (problem || pending) return;
    setPending(true);
    setNotice('');
    try {
      const created = await api<PostComment>(base, { method: 'POST', body: JSON.stringify({ content: content.trim() }) });
      setContent('');
      setNotice(created.status === 'VISIBLE' ? 'Đã đăng bình luận của bạn.' : 'Bình luận của bạn đang chờ duyệt.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 401 ? err.message : 'Chưa gửi được bình luận. Bạn thử lại sau ít phút nhé.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="binh-luan" aria-labelledby="binh-luan-title" className="mt-20 scroll-mt-24">
      <h2 id="binh-luan-title" className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em]">
        Bình luận
      </h2>

      <div className="mt-6 max-w-[60ch]">
        {!ready ? null : user ? (
          <form onSubmit={submit} noValidate>
            <label htmlFor="binh-luan-nd" className="mb-2 block text-base font-medium">
              Bình luận của bạn
            </label>
            <textarea
              id="binh-luan-nd"
              rows={4}
              value={content}
              maxLength={COMMENT_MAX}
              onChange={(e) => setContent(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy('binh-luan-nd', error)}
              className={`${fieldClass(!!error)} py-3`}
            />
            <FieldMessages id="binh-luan-nd" error={error} />
            <button
              type="submit"
              disabled={pending}
              className="mt-4 h-12 cursor-pointer rounded-full bg-primary px-6 font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Đang gửi…' : 'Gửi bình luận'}
            </button>
            <p role="status" className="mt-3 text-base text-ink-600">
              {notice}
            </p>
          </form>
        ) : (
          <p className="text-lg">
            <Link href={loginHref(path)} className="font-medium underline underline-offset-4">
              Đăng nhập
            </Link>{' '}
            để bình luận.
          </p>
        )}
      </div>

      {loadFailed ? (
        <p role="alert" className="mt-8 text-lg">
          Chưa tải được bình luận.{' '}
          <button type="button" onClick={() => void load()} className="cursor-pointer font-medium underline underline-offset-4">
            Tải lại
          </button>
        </p>
      ) : comments === null ? (
        <p role="status" className="mt-8 text-lg">
          Đang tải bình luận…
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-8 text-lg">Chưa có bình luận nào.</p>
      ) : (
        <ul className="mt-8 max-w-[60ch] space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-[var(--radius-soft)] bg-green-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <p className="font-semibold">{c.authorName}</p>
                <time dateTime={c.createdAt} className="text-base text-ink-600">
                  {formatDateVi(c.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-lg whitespace-pre-line">{c.content}</p>
              {c.status === 'PENDING' && <p className="mt-2 text-base font-medium text-ink-600">Đang chờ duyệt</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
