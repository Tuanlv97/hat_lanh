import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { errorText, useLoad } from '../lib/use-load';

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishAt: string | null;
  createdAt: string;
  topic: { id: string; name: string } | null;
};

export function Posts() {
  const { data, error, loading, reload } = useLoad(() => api<PostRow[]>('/admin/posts'), []);
  const [actionError, setActionError] = useState('');

  async function remove(p: PostRow) {
    if (!window.confirm(`Xóa bài "${p.title}"? Không thể hoàn tác.`)) return;
    setActionError('');
    try {
      await api(`/admin/posts/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  return (
    <section>
      <PageHeader title="Blog">
        <Link className="btn" to="/blog/moi">
          Viết bài mới
        </Link>
        <Link className="btn secondary" to="/blog/chu-de">
          Chủ đề
        </Link>
      </PageHeader>
      <Notice kind="error">{error || actionError}</Notice>
      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Danh sách bài viết</caption>
            <thead>
              <tr>
                <th scope="col">Tiêu đề</th>
                <th scope="col">Chủ đề</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Đăng lúc</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/blog/${encodeURIComponent(p.id)}`}>{p.title}</Link>
                  </td>
                  <td>{p.topic?.name ?? ''}</td>
                  <td>{p.status === 'PUBLISHED' ? <Badge tone="ok">Đã đăng</Badge> : <Badge tone="wait">Nháp</Badge>}</td>
                  <td>{formatDateTime(p.publishAt)}</td>
                  <td>
                    <button type="button" className="link" onClick={() => remove(p)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={5}>Chưa có bài viết.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
