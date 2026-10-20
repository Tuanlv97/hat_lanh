import type { Metadata } from 'next';
import { RegisterView } from '@/components/account/RegisterView';

export const metadata: Metadata = { title: 'Đăng ký', robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  // Validated with safeNextPath() before any redirect.
  return <RegisterView next={typeof next === 'string' ? next : undefined} />;
}
