import { ORDER_STATUSES, type OrderStatus } from '@hatlanh/shared';
import { Link, useSearchParams } from 'react-router-dom';
import { Notice, PageHeader } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDateTime, formatVnd, ORDER_STATUS_LABEL, telHref } from '../lib/format';
import type { AdminOrder } from '../lib/types';
import { useLoad } from '../lib/use-load';

export function Orders() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') ?? '';
  const status = (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : '';
  const { data, error, loading } = useLoad(() => api<AdminOrder[]>(`/admin/orders${status ? `?status=${status}` : ''}`), [status]);

  return (
    <section>
      <PageHeader title="Đơn hàng">
        <label htmlFor="o-status">Trạng thái </label>
        <select id="o-status" value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}>
          <option value="">Tất cả</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </PageHeader>
      <Notice kind="error">{error}</Notice>
      {loading && !data ? (
        <p role="status">Đang tải…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Danh sách đơn hàng</caption>
            <thead>
              <tr>
                <th scope="col">Mã đơn</th>
                <th scope="col">Khách</th>
                <th scope="col">Điện thoại</th>
                <th scope="col">Tổng</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Ngày đặt</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/don-hang/${encodeURIComponent(o.id)}`}>{o.code}</Link>
                  </td>
                  <td>{o.fullName}</td>
                  <td>
                    <a href={telHref(o.phone)}>{o.phone}</a>
                  </td>
                  <td>{formatVnd(o.totalVnd)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={6}>Chưa có đơn hàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
