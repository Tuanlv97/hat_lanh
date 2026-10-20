import type { Metadata } from 'next';
import { OrderDetailView } from '@/components/orders/OrderDetailView';

export const metadata: Metadata = { title: 'Chi tiết đơn hàng', robots: { index: false } };

type Params = Promise<{ code: string }>;

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* malformed escape: compare as-is (it will simply not match any order) */
  }
  return <OrderDetailView code={decoded} />;
}
