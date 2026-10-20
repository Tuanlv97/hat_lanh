import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { formatVnd } from '../lib/format';
import type { AdminProduct } from '../lib/types';
import { errorText, useLoad } from '../lib/use-load';

export function Products() {
  const { data, error, loading, reload } = useLoad(() => api<AdminProduct[]>('/admin/products'), []);
  const [actionError, setActionError] = useState('');

  async function hide(p: AdminProduct) {
    setActionError('');
    try {
      await api(`/admin/products/${encodeURIComponent(p.id)}/hide`, { method: 'PATCH' });
      await reload();
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  return (
    <section>
      <PageHeader title="Sản phẩm">
        <Link className="btn" to="/san-pham/moi">
          Thêm sản phẩm
        </Link>
      </PageHeader>
      <Notice kind="error">{error || actionError}</Notice>
      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Danh sách sản phẩm</caption>
            <thead>
              <tr>
                <th scope="col">Tên</th>
                <th scope="col">Nhóm</th>
                <th scope="col">Quy cách (giá, tồn)</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/san-pham/${encodeURIComponent(p.id)}`}>{p.name}</Link>
                  </td>
                  <td>{p.category.name}</td>
                  <td>
                    {p.variants.map((v) => (
                      <div key={v.id} className={v.isActive ? '' : 'muted'}>
                        {v.label}: {formatVnd(v.priceVnd)}, tồn {v.stock}
                        {!v.isActive && ' (ẩn)'}
                      </div>
                    ))}
                  </td>
                  <td>{p.isActive ? <Badge tone="ok">Đang bán</Badge> : <Badge tone="bad">Đã ẩn</Badge>}</td>
                  <td>
                    <Link to={`/san-pham/${encodeURIComponent(p.id)}`}>Sửa</Link>
                    {p.isActive && (
                      <>
                        {' · '}
                        <button type="button" className="link" onClick={() => hide(p)}>
                          Ẩn
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={5}>Chưa có sản phẩm.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
