'use client';

import type { AuthUser } from '@hatlanh/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, clearStoredSession, TOKEN_KEY, USER_KEY } from './api';

type AuthContextValue = {
  user: AuthUser | null;
  /** False until the stored session has been read on mount (avoids a login/logout flash). */
  ready: boolean;
  login(token: string, user: AuthUser): void;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUser(readStoredUser());
    setReady(true);

    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
    if (token) {
      api<{ user: AuthUser }>('/auth/me')
        .then(({ user: fresh }) => {
          if (cancelled) return;
          localStorage.setItem(USER_KEY, JSON.stringify(fresh));
          setUser(fresh);
        })
        .catch((err: unknown) => {
          // 401: api() already cleared the stale token; other failures keep the cached user.
          if (!cancelled && err instanceof ApiError && err.status === 401) setUser(null);
        });
    }

    const sync = () => setUser(readStoredUser());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === TOKEN_KEY || e.key === USER_KEY) sync();
    };
    window.addEventListener('hl:auth', sync);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('hl:auth', sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = useCallback((token: string, next: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: session lasts for this page only */
    }
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
