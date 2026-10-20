'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { safeNextPath } from '@/lib/next-path';

/**
 * Sign-in pages: once a user is known (already logged in, or just logged in / registered),
 * leave for the validated `next` path. Returns true while that redirect is pending.
 */
export function useLeaveWhenSignedIn(next: string | undefined): boolean {
  const { user, ready } = useAuth();
  const router = useRouter();
  const signedIn = ready && !!user;
  useEffect(() => {
    if (signedIn) router.replace(safeNextPath(next));
  }, [signedIn, next, router]);
  return signedIn;
}
