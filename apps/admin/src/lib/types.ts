import type { OrderStatus, ReturnReason, ReturnStatus } from '@hatlanh/shared';

export type Category = { id: string; slug: string; name: string };

export type Variant = { id: string; productId: string; label: string; priceVnd: number; stock: number; isActive: boolean };

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  description: string;
  origin: string;
  benefits: string;
  images: string[];
  isActive: boolean;
  category: { slug: string; name: string };
  variants: Variant[];
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPriceVnd: number;
  quantity: number;
};

export type AdminOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  fullName: string;
  phone: string;
  email: string | null;
  provinceCode: string;
  wardCode: string;
  addressDetail: string;
  totalVnd: number;
  createdAt: string;
  completedAt: string | null;
  items: OrderItem[];
  user: { id: string; name: string; email: string | null; phone: string | null } | null;
};

export type ReturnItem = {
  id: string;
  quantity: number;
  reason: ReturnReason;
  restocked?: boolean;
  orderItem: { id: string; productName: string; variantLabel: string; quantity: number };
};

export type AdminReturn = {
  id: string;
  status: ReturnStatus;
  note: string | null;
  createdAt: string;
  items: ReturnItem[];
  order: { id: string; code: string; fullName: string; phone: string; status: OrderStatus };
};
