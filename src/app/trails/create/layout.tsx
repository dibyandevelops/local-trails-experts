import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthPayload } from '@/lib/auth-server';

export default async function CreateTrailLayout({ children }: { children: ReactNode }) {
  const auth = await getServerAuthPayload();
  if (!auth) {
    redirect(`/?login=1&next=${encodeURIComponent('/upload')}`);
  }
  if (auth.role !== 'admin' && auth.role !== 'expert') {
    redirect('/trails');
  }
  return <>{children}</>;
}
