import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_KEY } from '../api';
import { AuthProvider, RequireAdmin } from '../auth';

function mockMe(user: { role: 'USER' | 'ADMIN' } | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      user
        ? new Response(JSON.stringify({ user: { id: '1', name: 'A', email: null, phone: null, ...user } }), { status: 200 })
        : new Response(JSON.stringify({ statusCode: 401, error: 'UNAUTHORIZED', message: 'x' }), { status: 401 }),
    ),
  );
}

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/san-pham']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>trang đăng nhập</p>} />
          <Route
            path="/san-pham"
            element={
              <RequireAdmin>
                <p>nội dung quản trị</p>
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('redirects to /login without a token', async () => {
    mockMe(null);
    renderGuarded();
    expect(await screen.findByText('trang đăng nhập')).toBeTruthy();
  });

  it('redirects to /login and drops the token when /auth/me says role USER', async () => {
    localStorage.setItem(TOKEN_KEY, 't');
    mockMe({ role: 'USER' });
    renderGuarded();
    expect(await screen.findByText('trang đăng nhập')).toBeTruthy();
    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull());
  });

  it('redirects to /login when the token is rejected', async () => {
    localStorage.setItem(TOKEN_KEY, 'stale');
    mockMe(null);
    renderGuarded();
    expect(await screen.findByText('trang đăng nhập')).toBeTruthy();
  });

  it('renders the page for an ADMIN', async () => {
    localStorage.setItem(TOKEN_KEY, 't');
    mockMe({ role: 'ADMIN' });
    renderGuarded();
    expect(await screen.findByText('nội dung quản trị')).toBeTruthy();
  });
});
