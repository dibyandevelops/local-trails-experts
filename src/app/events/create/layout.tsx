import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthPayload } from '@/lib/auth-server';

export default function CreateEventLayout({ children }: { children: ReactNode }) {
  const auth = getServerAuthPayload();
  if (!auth) {
    redirect('/login');
  }
  if (auth.role !== 'admin' && auth.role !== 'expert') {
    redirect('/events');
  }
  return <>{children}</>;
}

