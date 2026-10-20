'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const linkClass = 'inline-flex min-h-10 items-center hover:underline underline-offset-4';

/** "Đăng nhập" / "Đăng ký" only for visitors who are not signed in (hidden until the session is known). */
export function FooterAccountLinks() {
  const { user, ready } = useAuth();
  const guest = ready && !user;
  return (
    <ul className="mt-3 space-y-1">
      <li>
        <Link href="/gio-hang" className={linkClass}>
          Giỏ hàng
        </Link>
      </li>
      <li>
        <Link href="/tai-khoan/don-hang" className={linkClass}>
          Đơn hàng của tôi
        </Link>
      </li>
      {guest && (
        <>
          <li>
            <Link href="/dang-nhap" className={linkClass}>
              Đăng nhập
            </Link>
          </li>
          <li>
            <Link href="/dang-ky" className={linkClass}>
              Đăng ký
            </Link>
          </li>
        </>
      )}
    </ul>
  );
}
