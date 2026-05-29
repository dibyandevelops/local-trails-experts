import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerCurrentUser } from '@/lib/auth-server';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/trails');
  }

  return <>{children}</>;
}
