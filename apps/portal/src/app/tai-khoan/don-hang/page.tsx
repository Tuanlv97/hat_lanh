import type { Metadata } from 'next';
import { MyOrdersView } from '@/components/orders/MyOrdersView';

export const metadata: Metadata = { title: 'Đơn hàng của tôi', robots: { index: false } };

export default function MyOrdersPage() {
  return <MyOrdersView />;
}
