import { useState, type FormEvent } from 'react';
import { Field, Notice, PageHeader } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { errorText, useLoad } from '../lib/use-load';

type UserRow = { id: string; name: string; email: string | null; phone: string | null; role: 'USER' | 'ADMIN'; createdAt?: string };

export function Users() {
  const { data, error, loading } = useLoad(async () => (await api<{ items: UserRow[] }>('/admin/users')).items, []);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [ok, setOk] = useState('');
  const [pending, setPending] = useState(false);

  async function reset(e: FormEvent) {
    e.preventDefault();
    if (!target || pending) return;
    setFormError('');
    setOk('');
    if (!password) {
      setFormError('Vui lòng nhập mật khẩu mới');
      return;
    }
    setPending(true);
    try {
      await api(`/admin/users/${encodeURIComponent(target.id)}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
      setOk(`Đã đặt lại mật khẩu cho ${target.name}. Hãy nhắn mật khẩu mới cho khách.`);
      setPassword('');
      setTarget(null);
    } catch (err) {
      setFormError(err instanceof ApiError && err.fields?.password ? err.fields.password : errorText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <PageHeader title="Người dùng" />
      <Notice kind="error">{error}</Notice>
      <Notice kind="ok">{ok}</Notice>

      {target && (
        <form onSubmit={reset} noValidate className="card form inline">
          <Field id="u-pass" label={`Mật khẩu mới cho ${target.name}`}>
            <input id="u-pass" type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="row-actions">
            <button type="submit" className="btn" disabled={pending}>
              {pending ? 'Đang lưu…' : 'Đặt lại'}
            </button>
            <button type="button" className="link" onClick={() => setTarget(null)}>
              Hủy
            </button>
          </div>
          <Notice kind="error">{formError}</Notice>
        </form>
      )}

      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Danh sách người dùng</caption>
            <thead>
              <tr>
                <th scope="col">Tên</th>
                <th scope="col">Email</th>
                <th scope="col">Điện thoại</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Tạo lúc</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email ?? ''}</td>
                  <td>{u.phone ?? ''}</td>
                  <td>{u.role === 'ADMIN' ? 'Quản trị' : 'Khách'}</td>
                  <td>{formatDateTime(u.createdAt)}</td>
                  <td>
                    <button type="button" className="link" onClick={() => { setTarget(u); setOk(''); setFormError(''); }}>
                      Đặt lại mật khẩu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
