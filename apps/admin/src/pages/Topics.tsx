import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { errorText, useLoad } from '../lib/use-load';

type Topic = { id: string; name: string; slug: string };

export function Topics() {
  const { data, error, loading, reload } = useLoad(() => api<Topic[]>('/admin/topics'), []);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên chủ đề');
      return;
    }
    setFormError('');
    try {
      await api('/admin/topics', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      setName('');
      await reload();
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function remove(t: Topic) {
    if (!window.confirm(`Xóa chủ đề "${t.name}"?`)) return;
    setFormError('');
    try {
      await api(`/admin/topics/${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  return (
    <section>
      <PageHeader title="Chủ đề blog">
        <Link to="/blog">Về danh sách bài viết</Link>
      </PageHeader>
      <form onSubmit={add} noValidate className="card form inline">
        <Field id="t-name" label="Thêm chủ đề">
          <input id="t-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </Field>
        <button type="submit" className="btn">
          Thêm
        </button>
      </form>
      <Notice kind="error">{error || formError}</Notice>
      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : (
        <ul className="chips">
          {(data ?? []).map((t) => (
            <li key={t.id}>
              {t.name}{' '}
              <button type="button" className="link" aria-label={`Xóa chủ đề ${t.name}`} onClick={() => remove(t)}>
                Xóa
              </button>
            </li>
          ))}
          {data?.length === 0 && <li>Chưa có chủ đề nào.</li>}
        </ul>
      )}
    </section>
  );
}
