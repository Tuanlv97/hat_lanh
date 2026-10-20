import { nextOrderStatuses, type OrderStatus } from '@hatlanh/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Notice, PageHeader } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDateTime, formatVnd, ORDER_STATUS_LABEL, telHref } from '../lib/format';
import type { AdminOrder } from '../lib/types';
import { errorText, useLoad } from '../lib/use-load';

export function OrderDetail() {
  const { id = '' } = useParams();
  const path = `/admin/orders/${encodeURIComponent(id)}`;
  const { data: order, error, loading, reload } = useLoad(() => api<AdminOrder>(path), [path]);
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(false);

  async function move(to: OrderStatus) {
    const verb = to === 'CANCELLED' ? 'Hủy đơn này? Tồn kho sẽ được hoàn lại.' : `Chuyển đơn sang "${ORDER_STATUS_LABEL[to]}"?`;
    if (pending || !window.confirm(verb)) return;
    setPending(true);
    setActionError('');
    try {
      await api(`${path}/status`, { method: 'PATCH', body: JSON.stringify({ status: to }) });
      await reload();
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setPending(false);
    }
  }

  if (loading && !order) return <p role="status">Đang tải…</p>;
  if (!order) {
    return (
      <section>
        <PageHeader title="Không tìm thấy đơn hàng" />
        <Notice kind="error">{error}</Notice>
        <Link to="/don-hang">Về danh sách</Link>
      </section>
    );
  }

  const next = nextOrderStatuses(order.status);
  return (
    <section>
      <PageHeader title={`Đơn ${order.code}`}>
        <Link to="/don-hang">Về danh sách</Link>
      </PageHeader>

      <div className="card">
        <p>
          <StatusBadge status={order.status} /> · đặt lúc {formatDateTime(order.createdAt)}
          {order.completedAt && ` · hoàn tất ${formatDateTime(order.completedAt)}`}
        </p>
        <dl className="kv">
          <dt>Khách</dt>
          <dd>{order.fullName}</dd>
          <dt>Điện thoại</dt>
          <dd>
            <a href={telHref(order.phone)}>{order.phone}</a>
          </dd>
          {order.email && (
            <>
              <dt>Email</dt>
              <dd>{order.email}</dd>
            </>
          )}
          <dt>Địa chỉ</dt>
          <dd>
            {order.addressDetail} (phường/xã {order.wardCode}, tỉnh/thành {order.provinceCode})
          </dd>
        </dl>
      </div>

      <div className="table-wrap">
        <table>
          <caption className="sr-only">Sản phẩm trong đơn</caption>
          <thead>
            <tr>
              <th scope="col">Sản phẩm</th>
              <th scope="col">Đơn giá</th>
              <th scope="col">SL</th>
              <th scope="col">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.productName} · {it.variantLabel}
                </td>
                <td>{formatVnd(it.unitPriceVnd)}</td>
                <td>{it.quantity}</td>
                <td>{formatVnd(it.unitPriceVnd * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Tổng (chưa gồm phí vận chuyển)
              </th>
              <td>{formatVnd(order.totalVnd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h2>Chuyển trạng thái</h2>
        {next.length === 0 ? (
          <p className="muted">Đơn đã ở trạng thái cuối, không thể thay đổi.</p>
        ) : (
          <div className="row-actions">
            {next.map((s) => (
              <button key={s} type="button" className={s === 'CANCELLED' ? 'btn danger' : 'btn'} disabled={pending} onClick={() => move(s)}>
                {s === 'CANCELLED' ? 'Hủy đơn' : `Chuyển sang: ${ORDER_STATUS_LABEL[s]}`}
              </button>
            ))}
          </div>
        )}
        <Notice kind="error">{actionError}</Notice>
      </div>
    </section>
  );
}
