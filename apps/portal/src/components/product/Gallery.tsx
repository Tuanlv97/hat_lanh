'use client';

import { useState, type PointerEvent } from 'react';
import { assetUrl } from '@/lib/api';

const arrow = 'absolute top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-ink-800 shadow-[var(--shadow-md)] backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-surface';

/**
 * Main image plus thumbnails when there is more than one. API images may be SVGs or uploads of unknown size.
 * On pointer devices the main image zooms toward the cursor; arrows and thumbnails switch images.
 */
export function Gallery({ images, name, fallback }: { images: string[]; name: string; fallback: string }) {
  const list = images.length > 0 ? images : [fallback];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const safe = Math.min(index, list.length - 1);
  const current = list[safe];
  const many = list.length > 1;
  const go = (step: number) => setIndex((i) => (i + step + list.length) % list.length);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div>
      <div
        className="group relative aspect-square overflow-hidden rounded-[var(--radius-softer)] bg-green-100 shadow-[var(--shadow-sm)] ring-1 ring-green-500/30"
        onPointerMove={onMove}
        onPointerLeave={() => setZoom(null)}
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- API images and SVG placeholders, sizes unknown */}
        <img
          key={current}
          src={assetUrl(current)}
          alt={many ? `${name}, ảnh ${safe + 1} trên ${list.length}` : name}
          className="toast-in h-full w-full object-cover transition-transform duration-300 ease-out motion-reduce:transform-none"
          style={zoom ? { transform: 'scale(1.6)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" className={`${arrow} left-3`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Ảnh sau" className={`${arrow} right-3`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <span aria-hidden="true" className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-sm font-medium tabular-nums shadow-[var(--shadow-sm)]">
              {safe + 1} / {list.length}
            </span>
          </>
        )}
      </div>
      {many && (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Chọn ảnh">
          {list.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === safe ? 'true' : undefined}
                className={`block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-green-100 transition-all duration-200 ${
                  i === safe ? 'ring-3 ring-green-700' : 'opacity-70 hover:-translate-y-0.5 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of the same images */}
                <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
