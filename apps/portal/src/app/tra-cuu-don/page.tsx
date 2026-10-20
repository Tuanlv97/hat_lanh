import type { Metadata } from 'next';
import { LookupView } from '@/components/orders/LookupView';

export const metadata: Metadata = {
  title: 'Tra cứu đơn',
  description: 'Xem trạng thái đơn hàng bằng mã đơn và số điện thoại đã dùng khi đặt.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LookupPage({ searchParams }: { searchParams: SearchParams }) {
  const { code } = await searchParams;
  return <LookupView initialCode={typeof code === 'string' ? code.trim() : ''} />;
}
