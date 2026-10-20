import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field, Notice, PageHeader } from '../components/ui';
import { api, ApiError, assetUrl } from '../lib/api';
import { parseIntField, slugify } from '../lib/format';
import type { AdminProduct, Category, Variant } from '../lib/types';
import { errorText, useLoad } from '../lib/use-load';

type VariantDraft = { id?: string; label: string; price: string; stock: string; isActive: boolean; error?: string; saved?: boolean };

const blankVariant = (): VariantDraft => ({ label: '', price: '', stock: '0', isActive: true });
const toDraft = (v: Variant): VariantDraft => ({ id: v.id, label: v.label, price: String(v.priceVnd), stock: String(v.stock), isActive: v.isActive });

function variantBody(v: VariantDraft): { label: string; priceVnd: number; stock: number; isActive: boolean } | string {
  const priceVnd = parseIntField(v.price);
  const stock = parseIntField(v.stock);
  if (!v.label.trim()) return 'Nhập tên quy cách';
  if (!Number.isFinite(priceVnd) || priceVnd <= 0) return 'Giá phải là số nguyên lớn hơn 0';
  if (!Number.isFinite(stock)) return 'Tồn kho phải là số nguyên không âm';
  return { label: v.label.trim(), priceVnd, stock, isActive: v.isActive };
}

export function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'moi';
  const navigate = useNavigate();
  const categories = useLoad(() => api<Category[]>('/categories'), []);
  const product = useLoad(
    async () => (isNew ? null : (await api<AdminProduct[]>('/admin/products')).find((p) => p.id === id) ?? null),
    [id, isNew],
  );

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState('');
  const [benefits, setBenefits] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([blankVariant()]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const p = product.data;
    if (!p) return;
    setName(p.name);
    setSlug(p.slug);
    setCategoryId(p.categoryId);
    setDescription(p.description);
    setOrigin(p.origin);
    setBenefits(p.benefits);
    setImages(p.images);
    setIsActive(p.isActive);
    setVariants(p.variants.map(toDraft));
  }, [product.data]);

  useEffect(() => {
    if (isNew && !categoryId && categories.data?.[0]) setCategoryId(categories.data[0].id);
  }, [isNew, categoryId, categories.data]);

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { url } = await api<{ url: string }>('/admin/uploads', { method: 'POST', body: fd });
      setImages((cur) => [...cur, url]);
    } catch (err) {
      setError(errorText(err));
    }
  }

  const patchVariant = (i: number, patch: Partial<VariantDraft>) =>
    setVariants((cur) => cur.map((v, k) => (k === i ? { ...v, ...patch, saved: false, error: undefined } : v)));

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError('');
    setOk('');
    const fields = { name: name.trim(), slug: slug.trim() || slugify(name), categoryId, description: description.trim(), origin: origin.trim(), benefits: benefits.trim(), images, isActive };
    if (!fields.name || !fields.description || !fields.origin || !fields.benefits || !fields.categoryId) {
      setError('Vui lòng điền tên, nhóm, mô tả, nguồn gốc và công dụng');
      return;
    }
    setPending(true);
    try {
      if (isNew) {
        const bodies = variants.map(variantBody);
        const bad = bodies.find((b): b is string => typeof b === 'string');
        if (bad) {
          setError(bad);
          return;
        }
        const created = await api<{ id: string }>('/admin/products', {
          method: 'POST',
          body: JSON.stringify({ ...fields, variants: bodies }),
        });
        navigate(`/san-pham/${encodeURIComponent(created.id)}`, { replace: true });
      } else {
        await api(`/admin/products/${encodeURIComponent(id!)}`, { method: 'PATCH', body: JSON.stringify(fields) });
        setOk('Đã lưu sản phẩm.');
      }
    } catch (err) {
      setError(err instanceof ApiError && err.error === 'SLUG_TAKEN' ? 'Slug đã tồn tại' : errorText(err));
    } finally {
      setPending(false);
    }
  }

  async function saveVariant(i: number) {
    const v = variants[i];
    const body = variantBody(v);
    if (typeof body === 'string') {
      setVariants((cur) => cur.map((x, k) => (k === i ? { ...x, error: body } : x)));
      return;
    }
    try {
      const path = v.id ? `/admin/variants/${encodeURIComponent(v.id)}` : `/admin/products/${encodeURIComponent(id!)}/variants`;
      const saved = await api<Variant>(path, { method: v.id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setVariants((cur) => cur.map((x, k) => (k === i ? { ...toDraft(saved), saved: true } : x)));
    } catch (err) {
      setVariants((cur) => cur.map((x, k) => (k === i ? { ...x, error: errorText(err) } : x)));
    }
  }

  async function removeVariant(i: number) {
    const v = variants[i];
    if (!v.id) {
      setVariants((cur) => cur.filter((_, k) => k !== i));
      return;
    }
    if (!window.confirm(`Xóa quy cách "${v.label}"?`)) return;
    try {
      await api(`/admin/variants/${encodeURIComponent(v.id)}`, { method: 'DELETE' });
      setVariants((cur) => cur.filter((_, k) => k !== i));
    } catch (err) {
      setVariants((cur) => cur.map((x, k) => (k === i ? { ...x, error: errorText(err) } : x)));
    }
  }

  if (!isNew && product.loading && !product.data) return <p role="status">Đang tải…</p>;
  if (!isNew && !product.loading && !product.data) {
    return (
      <section>
        <PageHeader title="Không tìm thấy sản phẩm" />
        <Notice kind="error">{product.error}</Notice>
        <Link to="/san-pham">Về danh sách</Link>
      </section>
    );
  }

  return (
    <section>
      <PageHeader title={isNew ? 'Thêm sản phẩm' : `Sửa: ${product.data?.name ?? ''}`}>
        <Link to="/san-pham">Về danh sách</Link>
      </PageHeader>

      <form onSubmit={saveProduct} noValidate className="card form">
        <Field id="p-name" label="Tên sản phẩm">
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id="p-slug" label="Slug (để trống để tự tạo từ tên)">
          <input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name)} />
        </Field>
        <Field id="p-cat" label="Nhóm">
          <select id="p-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="p-desc" label="Mô tả">
          <textarea id="p-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field id="p-origin" label="Nguồn gốc">
          <textarea id="p-origin" rows={2} value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </Field>
        <Field id="p-benefits" label="Công dụng">
          <textarea id="p-benefits" rows={3} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </Field>

        <fieldset>
          <legend>Ảnh</legend>
          <ul className="thumbs">
            {images.map((src, i) => (
              <li key={src + i}>
                <img src={assetUrl(src)} alt={`Ảnh ${i + 1}`} />
                <button type="button" className="link" onClick={() => setImages((cur) => cur.filter((_, k) => k !== i))}>
                  Bỏ ảnh
                </button>
              </li>
            ))}
          </ul>
          <label htmlFor="p-upload" className="btn secondary">
            Tải ảnh lên
          </label>
          <input id="p-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="sr-only" />
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Đang bán
        </label>

        {isNew && <VariantsEditor variants={variants} patch={patchVariant} onAdd={() => setVariants((c) => [...c, blankVariant()])} onRemove={removeVariant} />}

        <Notice kind="error">{error}</Notice>
        <Notice kind="ok">{ok}</Notice>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? 'Đang lưu…' : isNew ? 'Tạo sản phẩm' : 'Lưu sản phẩm'}
        </button>
      </form>

      {!isNew && (
        <div className="card">
          <VariantsEditor
            variants={variants}
            patch={patchVariant}
            onAdd={() => setVariants((c) => [...c, blankVariant()])}
            onRemove={removeVariant}
            onSave={saveVariant}
          />
        </div>
      )}
    </section>
  );
}

function VariantsEditor({
  variants,
  patch,
  onAdd,
  onRemove,
  onSave,
}: {
  variants: VariantDraft[];
  patch(i: number, p: Partial<VariantDraft>): void;
  onAdd(): void;
  onRemove(i: number): void;
  /** Present only for an existing product: each row saves on its own. */
  onSave?(i: number): void;
}) {
  return (
    <fieldset>
      <legend>Quy cách</legend>
      {variants.map((v, i) => (
        <div key={v.id ?? `new-${i}`} className="variant-row">
          <Field id={`v${i}-label`} label="Tên">
            <input id={`v${i}-label`} value={v.label} onChange={(e) => patch(i, { label: e.target.value })} />
          </Field>
          <Field id={`v${i}-price`} label="Giá (đ)">
            <input id={`v${i}-price`} inputMode="numeric" value={v.price} onChange={(e) => patch(i, { price: e.target.value })} />
          </Field>
          <Field id={`v${i}-stock`} label="Tồn kho">
            <input id={`v${i}-stock`} inputMode="numeric" value={v.stock} onChange={(e) => patch(i, { stock: e.target.value })} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={v.isActive} onChange={(e) => patch(i, { isActive: e.target.checked })} /> Đang bán
          </label>
          <div className="row-actions">
            {onSave && (
              <button type="button" className="btn secondary" onClick={() => onSave(i)}>
                Lưu quy cách
              </button>
            )}
            <button type="button" className="link" onClick={() => onRemove(i)}>
              Xóa
            </button>
          </div>
          <Notice kind="error">{v.error}</Notice>
          <Notice kind="ok">{v.saved ? 'Đã lưu.' : ''}</Notice>
        </div>
      ))}
      <button type="button" className="btn secondary" onClick={onAdd}>
        Thêm quy cách
      </button>
    </fieldset>
  );
}
