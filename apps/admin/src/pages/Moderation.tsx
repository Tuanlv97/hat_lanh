import { MODERATION_STATUSES, type ModerationStatus } from '@hatlanh/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { errorText, useLoad } from '../lib/use-load';

type Item = {
  kind: 'review' | 'comment';
  id: string;
  content: string;
  rating?: number;
  authorName: string;
  targetName: string;
  status: ModerationStatus;
  createdAt: string;
};

const STATUS_LABEL: Record<ModerationStatus, string> = { PENDING: 'Chờ duyệt', VISIBLE: 'Đang hiển thị', HIDDEN: 'Đã ẩn' };

export function Moderation() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? 'PENDING';
  const status = (MODERATION_STATUSES as readonly string[]).includes(raw) ? (raw as ModerationStatus) : 'PENDING';
  const { data, error, loading, reload } = useLoad(() => api<Item[]>(`/admin/moderation?status=${status}`), [status]);
  const [actionError, setActionError] = useState('');

  async function act(it: Item, action: 'approve' | 'hide' | 'delete') {
    if (action === 'delete' && !window.confirm('Xóa hẳn nội dung này? Không thể hoàn tác.')) return;
    setActionError('');
    try {
      const path = `/admin/moderation/${it.kind}/${encodeURIComponent(it.id)}`;
      if (action === 'delete') await api(path, { method: 'DELETE' });
      else await api(path, { method: 'PATCH', body: JSON.stringify({ action }) });
      await reload();
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  return (
    <section>
      <PageHeader title="Bình luận và đánh giá">
        <label htmlFor="m-status">Trạng thái </label>
        <select id="m-status" value={status} onChange={(e) => setParams({ status: e.target.value })}>
          {MODERATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <Link className="btn secondary" to="/binh-luan/tu-khoa">
          Từ khóa nhạy cảm
        </Link>
      </PageHeader>
      <Notice kind="error">{error || actionError}</Notice>
      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : data?.length === 0 ? (
        <p>Không có nội dung nào ở trạng thái này.</p>
      ) : (
        <ul className="stack">
          {(data ?? []).map((it) => (
            <li key={`${it.kind}-${it.id}`} className="card">
              <p className="muted">
                {it.kind === 'review' ? `Đánh giá ${it.rating}/5` : 'Bình luận'} · {it.authorName} · {it.targetName} · {formatDateTime(it.createdAt)}
              </p>
              <p className="pre">{it.content}</p>
              <div className="row-actions">
                {it.status !== 'VISIBLE' && (
                  <button type="button" className="btn" onClick={() => act(it, 'approve')}>
                    Duyệt
                  </button>
                )}
                {it.status !== 'HIDDEN' && (
                  <button type="button" className="btn secondary" onClick={() => act(it, 'hide')}>
                    Ẩn
                  </button>
                )}
                <button type="button" className="btn danger" onClick={() => act(it, 'delete')}>
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
