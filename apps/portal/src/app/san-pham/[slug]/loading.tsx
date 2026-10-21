export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8" role="status" aria-label="Đang tải sản phẩm">
      <div className="skeleton h-5 w-48" />
      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
        <div className="skeleton aspect-square rounded-[var(--radius-softer)]" />
        <div>
          <div className="skeleton h-7 w-28 rounded-full" />
          <div className="skeleton mt-4 h-14 w-4/5" />
          <div className="skeleton mt-3 h-6 w-1/2" />
          <div className="skeleton mt-6 h-72 rounded-[var(--radius-softer)]" />
        </div>
      </div>
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
