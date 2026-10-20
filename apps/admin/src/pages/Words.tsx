import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { errorText, useLoad } from '../lib/use-load';

type Word = { id: string; term: string };

/** Bình luận hoặc đánh giá chứa từ khóa ở đây sẽ vào hàng chờ duyệt thay vì hiển thị ngay. */
export function Words() {
  const { data, error, loading, reload } = useLoad(() => api<Word[]>('/admin/sensitive-words'), []);
  const [term, setTerm] = useState('');
  const [formError, setFormError] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!term.trim()) {
      setFormError('Vui lòng nhập từ khóa');
      return;
    }
    setFormError('');
    try {
      await api('/admin/sensitive-words', { method: 'POST', body: JSON.stringify({ term: term.trim() }) });
      setTerm('');
      await reload();
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  async function remove(w: Word) {
    setFormError('');
    try {
      await api(`/admin/sensitive-words/${encodeURIComponent(w.id)}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  return (
    <section>
      <PageHeader title="Từ khóa nhạy cảm">
        <Link to="/binh-luan">Về hàng chờ duyệt</Link>
      </PageHeader>
      <p className="muted">Nội dung chứa từ khóa (không phân biệt dấu và hoa thường) sẽ chờ duyệt trước khi hiển thị.</p>
      <form onSubmit={add} noValidate className="card form inline">
        <Field id="w-term" label="Thêm từ khóa">
          <input id="w-term" value={term} maxLength={100} onChange={(e) => setTerm(e.target.value)} />
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
          {(data ?? []).map((w) => (
            <li key={w.id}>
              {w.term}{' '}
              <button type="button" className="link" aria-label={`Xóa từ khóa ${w.term}`} onClick={() => remove(w)}>
                Xóa
              </button>
            </li>
          ))}
          {data?.length === 0 && <li>Chưa có từ khóa nào.</li>}
        </ul>
      )}
    </section>
  );
}
