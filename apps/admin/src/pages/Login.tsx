import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setPending(true);
    setError('');
    try {
      await login(identifier.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chưa kết nối được máy chủ. Bạn thử lại sau nhé.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit} noValidate>
        <h1>Quản trị Hạt Lành</h1>
        <label htmlFor="identifier">Email</label>
        <input id="identifier" type="text" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <label htmlFor="password">Mật khẩu</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending}>
          {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}
