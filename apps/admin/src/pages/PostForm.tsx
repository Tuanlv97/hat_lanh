import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichEditor } from '../components/RichEditor';
import { Field, Notice, PageHeader } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { isoToLocal, localToIso } from '../lib/html';
import type { AdminProduct } from '../lib/types';
import { errorText, useLoad } from '../lib/use-load';

type Topic = { id: string; name: string; slug: string };
type PostFull = {
  id: string;
  slug: string;
  title: string;
  html: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishAt: string | null;
  topicId: string | null;
  productIds: string[];
};

export function PostForm() {
  const { id } = useParams();
  const isNew = !id || id === 'moi';
  const navigate = useNavigate();
  const topics = useLoad(() => api<Topic[]>('/admin/topics'), []);
  const products = useLoad(() => api<AdminProduct[]>('/admin/products'), []);
  const post = useLoad(async () => (isNew ? null : api<PostFull>(`/admin/posts/${encodeURIComponent(id!)}`)), [id, isNew]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [topicId, setTopicId] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [publishAt, setPublishAt] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const p = post.data;
    if (!p) return;
    setTitle(p.title);
    setSlug(p.slug);
    setTopicId(p.topicId ?? '');
    setStatus(p.status);
    setPublishAt(isoToLocal(p.publishAt));
    setProductIds(p.productIds);
    setHtml(p.html);
  }, [post.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError('');
    setOk('');
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề');
      return;
    }
    const at = localToIso(publishAt);
    if (publishAt && !at) {
      setError('Thời gian đăng không hợp lệ');
      return;
    }
    const body = { title: title.trim(), html, status, topicId: topicId || null, publishAt: at, productIds, ...(slug.trim() ? { slug: slug.trim() } : {}) };
    setPending(true);
    try {
      if (isNew) {
        const created = await api<{ id: string }>('/admin/posts', { method: 'POST', body: JSON.stringify(body) });
        navigate(`/blog/${encodeURIComponent(created.id)}`, { replace: true });
      } else {
        await api(`/admin/posts/${encodeURIComponent(id!)}`, { method: 'PATCH', body: JSON.stringify(body) });
        setOk(status === 'PUBLISHED' ? 'Đã lưu. Bài hiển thị trên trang khi đến giờ đăng.' : 'Đã lưu bản nháp.');
      }
    } catch (err) {
      setError(err instanceof ApiError && err.error === 'SLUG_TAKEN' ? 'Slug đã tồn tại' : errorText(err));
    } finally {
      setPending(false);
    }
  }

  const toggleProduct = (pid: string, on: boolean) => setProductIds((cur) => (on ? [...cur, pid] : cur.filter((x) => x !== pid)));

  if (!isNew && post.loading && !post.data) return <p role="status">Đang tải…</p>;
  if (!isNew && !post.data) {
    return (
      <section>
        <PageHeader title="Không tìm thấy bài viết" />
        <Notice kind="error">{post.error}</Notice>
        <Link to="/blog">Về danh sách</Link>
      </section>
    );
  }

  return (
    <section>
      <PageHeader title={isNew ? 'Viết bài mới' : 'Sửa bài viết'}>
        <Link to="/blog">Về danh sách</Link>
      </PageHeader>
      <form onSubmit={save} noValidate className="card form">
        <Field id="po-title" label="Tiêu đề">
          <input id="po-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field id="po-slug" label="Slug (để trống để tự tạo)">
          <input id="po-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field id="po-topic" label="Chủ đề">
          <select id="po-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">Không có</option>
            {(topics.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="po-status" label="Trạng thái">
          <select id="po-status" value={status} onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}>
            <option value="DRAFT">Nháp</option>
            <option value="PUBLISHED">Đăng</option>
          </select>
        </Field>
        <Field id="po-at" label="Giờ đăng (để trống = đăng ngay khi chọn Đăng; chọn giờ tương lai để hẹn giờ)">
          <input id="po-at" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
        </Field>

        <fieldset>
          <legend>Sản phẩm liên kết</legend>
          <div className="checks">
            {(products.data ?? []).map((p) => (
              <label key={p.id} className="check">
                <input type="checkbox" checked={productIds.includes(p.id)} onChange={(e) => toggleProduct(p.id, e.target.checked)} /> {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <span className="label">Nội dung</span>
          <RichEditor key={post.data?.id ?? 'new'} initialHtml={post.data?.html ?? ''} onChange={setHtml} onError={setError} />
        </div>

        <Notice kind="error">{error}</Notice>
        <Notice kind="ok">{ok}</Notice>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu bài viết'}
        </button>
      </form>
    </section>
  );
}
