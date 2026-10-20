'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FieldMessages, FormAlert, SubmitButton, describedBy, fieldClass, focusById } from '@/components/form';
import { api, ApiError } from '@/lib/api';
import {
  mapReviewError,
  REVIEW_CONTENT_MAX,
  reviewResultMessage,
  validateReview,
  type CustomerOrder,
  type ProductReview,
} from '@/lib/orders';

const RATING_WORDS = ['', 'Không hài lòng', 'Tạm được', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

type ReviewState =
  | { status: 'loading' }
  | { status: 'open' }
  | { status: 'done'; reviewStatus: string; justPosted: boolean }
  | { status: 'gone' };

/** One review block per distinct product of a COMPLETED order (two variants of one product share a review). */
export function ReviewList({ order }: { order: CustomerOrder }) {
  const products = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of order.items) if (!seen.has(it.productId)) seen.set(it.productId, it.productName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [order.items]);

  return (
    <section aria-labelledby="dg-title" className="mt-16 sm:mt-24">
      <h2 id="dg-title" className="text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em]">
        Đánh giá sản phẩm
      </h2>
      <p className="mt-2 max-w-[60ch] text-lg">Mỗi sản phẩm bạn đánh giá một lần. Đánh giá giúp khách sau chọn đúng món.</p>
      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {products.map((p) => (
          <li key={p.id} id={`danh-gia-${p.id}`} className="scroll-mt-24 rounded-[var(--radius-softer)] bg-green-100 p-5 sm:p-7">
            <ProductReviewBlock productId={p.id} productName={p.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductReviewBlock({ productId, productName }: { productId: string; productName: string }) {
  const [state, setState] = useState<ReviewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api<ProductReview[]>(`/products/${encodeURIComponent(productId)}/reviews`, { cache: 'no-store' })
      .then((rows) => {
        if (cancelled) return;
        const mine = Array.isArray(rows) ? rows.find((r) => r.mine) : undefined;
        setState(mine ? { status: 'done', reviewStatus: mine.status, justPosted: false } : { status: 'open' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Unknown product: nothing to review. Other failures still show the form (the API rejects duplicates).
        setState(err instanceof ApiError && err.status === 404 ? { status: 'gone' } : { status: 'open' });
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const headingId = `dg-sp-${productId}`;
  return (
    <>
      <h3 id={headingId} className="text-xl font-semibold">
        {productName}
      </h3>
      {state.status === 'loading' && (
        <p role="status" className="mt-2 text-base">
          Đang tải…
        </p>
      )}
      {state.status === 'gone' && <p className="mt-2 text-base">Sản phẩm này không còn trên cửa hàng nên không đánh giá được.</p>}
      {state.status === 'done' && <ReviewDone reviewStatus={state.reviewStatus} justPosted={state.justPosted} />}
      {state.status === 'open' && (
        <ReviewForm
          productId={productId}
          headingId={headingId}
          onDone={(reviewStatus, justPosted) => setState({ status: 'done', reviewStatus, justPosted })}
        />
      )}
    </>
  );
}

function ReviewDone({ reviewStatus, justPosted }: { reviewStatus: string; justPosted: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (justPosted) ref.current?.focus();
  }, [justPosted]);
  const text =
    reviewStatus === 'ALREADY'
      ? 'Bạn đã đánh giá sản phẩm này'
      : justPosted
    ? reviewResultMessage(reviewStatus)
    : reviewStatus === 'VISIBLE'
      ? 'Bạn đã đánh giá sản phẩm này. Cảm ơn bạn!'
      : `Bạn đã đánh giá sản phẩm này. ${reviewResultMessage(reviewStatus)}.`;
  return (
    <p ref={ref} tabIndex={-1} role="status" className="mt-3 rounded-2xl bg-surface px-4 py-3 text-lg font-medium focus:outline-none">
      {text}
    </p>
  );
}

function ReviewForm({ productId, headingId, onDone }: { productId: string; headingId: string; onDone(status: string, justPosted: boolean): void }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'rating' | 'content', string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const base = `dg-${productId}`;
  const contentId = `${base}-content`;
  const ratingErrId = `${base}-rating-err`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setMessage(null);
    const v = validateReview({ rating, content });
    if (!v.ok) {
      setErrors(v.errors);
      focusById(v.errors.rating ? `${base}-star-1` : contentId);
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    try {
      const res = await api<{ status: string }>(`/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        body: JSON.stringify(v.data),
      });
      onDone(res.status, true);
    } catch (err) {
      const m = mapReviewError(err);
      if (m.alreadyReviewed) {
        onDone('ALREADY', true); // shows "Bạn đã đánh giá sản phẩm này"
        return;
      }
      setErrors(m.fieldErrors);
      setMessage(m.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={headingId} className="mt-3">
      <fieldset aria-describedby={errors.rating ? ratingErrId : undefined}>
        <legend className="text-base font-medium">Bạn chấm mấy sao?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const id = `${base}-star-${n}`;
            const on = rating >= n;
            return (
              <div key={n}>
                <input
                  id={id}
                  type="radio"
                  name={`${base}-rating`}
                  value={n}
                  checked={rating === n}
                  disabled={pending}
                  onChange={() => setRating(n)}
                  aria-invalid={errors.rating ? true : undefined}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className={`inline-flex h-12 min-w-12 cursor-pointer items-center justify-center gap-1 rounded-full px-3 text-base font-medium transition-colors duration-200 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-700 ${
                    rating === n ? 'bg-ink-800 text-bg' : on ? 'bg-honey-400 text-ink-800' : 'bg-surface text-ink-800 hover:bg-green-500'
                  }`}
                >
                  <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
                    <path d="M10 1.8l2.5 5.1 5.6.8-4 4 .9 5.6L10 14.6l-5 2.7.9-5.6-4-4 5.6-.8z" />
                  </svg>
                  {n}
                  <span className="sr-only"> sao, {RATING_WORDS[n]}</span>
                </label>
              </div>
            );
          })}
        </div>
        <p className="mt-2 min-h-7 text-base text-ink-600" aria-hidden="true">
          {rating > 0 ? `${rating} sao: ${RATING_WORDS[rating]}` : ''}
        </p>
        {errors.rating && (
          <p id={ratingErrId} className="text-base font-medium text-error">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div className="mt-4">
        <label htmlFor={contentId} className="mb-2 block text-base font-medium">
          Cảm nhận của bạn
        </label>
        <textarea
          id={contentId}
          rows={4}
          maxLength={REVIEW_CONTENT_MAX}
          value={content}
          disabled={pending}
          onChange={(e) => setContent(e.target.value)}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={describedBy(contentId, errors.content, 'x')}
          className={`${fieldClass(!!errors.content)} resize-y py-3 leading-relaxed`}
        />
        <FieldMessages id={contentId} error={errors.content} hint={`${content.length}/${REVIEW_CONTENT_MAX} ký tự`} />
      </div>

      <FormAlert message={message} />
      <SubmitButton pending={pending} label="Gửi đánh giá" pendingLabel="Đang gửi…" className="mt-5 sm:w-auto" />
    </form>
  );
}
