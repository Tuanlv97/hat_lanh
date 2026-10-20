'use client';

import { useState } from 'react';
import { assetUrl } from '@/lib/api';

/** Main image plus thumbnails when there is more than one. API images may be SVGs or uploads of unknown size. */
export function Gallery({ images, name, fallback }: { images: string[]; name: string; fallback: string }) {
  const list = images.length > 0 ? images : [fallback];
  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, list.length - 1)];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-[var(--radius-softer)] bg-green-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- API images and SVG placeholders, sizes unknown */}
        <img
          key={current}
          src={assetUrl(current)}
          alt={list.length > 1 ? `${name}, ảnh ${index + 1} trên ${list.length}` : name}
          className="toast-in h-full w-full object-cover"
        />
      </div>
      {list.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Chọn ảnh">
          {list.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-green-100 transition-[opacity,box-shadow] duration-200 ${
                  i === index ? 'ring-3 ring-green-700' : 'opacity-75 hover:opacity-100'
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
