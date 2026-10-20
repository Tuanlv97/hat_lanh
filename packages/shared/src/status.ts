export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function nextOrderStatuses(from: OrderStatus): OrderStatus[] {
  return [...NEXT[from]];
}

export const RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = ['DAMAGED', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER'] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const MODERATION_STATUSES = ['VISIBLE', 'PENDING', 'HIDDEN'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
