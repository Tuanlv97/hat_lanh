export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8" role="status" aria-label="Đang tải sản phẩm">
      <div className="skeleton h-14 w-2/3 max-w-md" />
      <div className="skeleton mt-4 h-6 w-full max-w-xl" />
      <ul className="mt-14 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <div className="skeleton aspect-square" />
            <div className="skeleton mt-3 h-5 w-3/4" />
            <div className="skeleton mt-2 h-5 w-1/3" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
