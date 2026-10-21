import Link from 'next/link';

type StateMessageProps = {
  title: string;
  body: string;
  action?: { href: string; label: string };
  /** `polite` for results that change after a search; errors use `alert`. */
  role?: 'status' | 'alert';
};

/** Friendly empty / error block in the shop's voice. */
export function StateMessage({ title, body, action, role = 'status' }: StateMessageProps) {
  return (
    <div role={role} className="rounded-[var(--radius-softer)] bg-green-100 px-6 py-10 sm:px-10 sm:py-14">
      <h2 className="text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-3 max-w-[52ch] text-lg">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="btn btn-primary mt-6"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
