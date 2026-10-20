const STAR = 'M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8 1.7 7.8l5.8-.7z';

/** Five stars filled to the nearest whole star; the exact number is spoken. */
export function Stars({ value, className = 'h-5 w-5' }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${(Math.round(value * 10) / 10).toString().replace('.', ',')} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={className} aria-hidden="true">
          <path d={STAR} fill={n <= filled ? 'var(--honey-400)' : 'var(--green-100)'} stroke="var(--ink-800)" strokeOpacity=".4" strokeWidth="1" />
        </svg>
      ))}
    </span>
  );
}
