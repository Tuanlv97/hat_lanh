import type { OrderStatus, ReturnStatus } from '@hatlanh/shared';
import { ORDER_STATUS_LABEL, RETURN_STATUS_LABEL } from '../lib/format';
import { Badge } from './ui';

const ORDER_TONE = { PENDING: 'wait', CONFIRMED: 'info', SHIPPING: 'info', COMPLETED: 'ok', CANCELLED: 'bad' } as const;
const RETURN_TONE = { REQUESTED: 'wait', APPROVED: 'ok', REJECTED: 'bad' } as const;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export function ReturnBadge({ status }: { status: ReturnStatus }) {
  return <Badge tone={RETURN_TONE[status]}>{RETURN_STATUS_LABEL[status]}</Badge>;
}
