import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8">
      <div className="rounded-[var(--radius-softer)] bg-green-100 px-6 py-14 sm:px-12 sm:py-20">
        <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-tight font-semibold tracking-[-0.03em]">Trang này chưa có</h1>
        <p className="mt-4 max-w-md text-lg">Có thể đường dẫn đã thay đổi, hoặc trang đang được chuẩn bị.</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-7 font-medium text-bg transition-opacity duration-200 hover:opacity-90">
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
