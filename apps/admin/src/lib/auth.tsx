import type { AuthUser } from '@hatlanh/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError, clearToken, readToken, storeToken } from './api';

type AuthContextValue = {
  /** The signed-in admin; null when signed out or while `ready` is false. */
  user: AuthUser | null;
  /** False until the stored token has been checked against /auth/me. */
  ready: boolean;
  login(identifier: string, password: string): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = readToken();
    if (!token) {
      setReady(true);
      return;
    }
    api<{ user: AuthUser }>('/auth/me', {}, token)
      .then(({ user: me }) => {
        if (cancelled) return;
        if (me.role === 'ADMIN') setUser(me);
        else clearToken();
      })
      .catch((err: unknown) => {
        // A rejected token is dropped; a network failure keeps it so a reload can recover.
        if (err instanceof ApiError && err.status === 401) clearToken();
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const session = await api<{ token: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ identifier, password }) },
      null,
    );
    // Customers have accounts too: only admins get a session here, and nothing is stored for others.
    if (session.user.role !== 'ADMIN') throw new ApiError(403, 'NOT_ADMIN', 'Tài khoản này không có quyền quản trị');
    storeToken(session.token);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Renders children only for a signed-in ADMIN; everyone else goes to /login. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <p role="status" className="boot">
        Đang tải…
      </p>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
