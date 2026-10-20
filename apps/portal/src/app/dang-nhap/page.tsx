import type { Metadata } from 'next';
import { LoginView } from '@/components/account/LoginView';

export const metadata: Metadata = { title: 'Đăng nhập', robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  // Validated with safeNextPath() before any redirect.
  return <LoginView next={typeof next === 'string' ? next : undefined} />;
}
