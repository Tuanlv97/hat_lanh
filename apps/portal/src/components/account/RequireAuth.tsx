'use client';

import type { AuthUser } from '@hatlanh/shared';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { loginHref } from '@/lib/next-path';

/**
 * Account pages: nothing protected renders until the stored session has been read (`ready`);
 * visitors without a session are sent to the login page with `next` set to this page.
 */
export function RequireAuth({ children }: { children: (user: AuthUser) => ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const out = ready && !user;

  useEffect(() => {
    if (out) router.replace(loginHref(pathname));
  }, [out, pathname, router]);

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
        <p role="status" className="text-lg">
          {out ? 'Bạn cần đăng nhập. Đang chuyển tới trang đăng nhập…' : 'Đang tải…'}
        </p>
      </div>
    );
  }
  return <>{children(user)}</>;
}
