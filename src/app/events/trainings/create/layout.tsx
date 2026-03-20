import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthPayload } from '@/lib/auth-server';

export default async function CreateTrainingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await getServerAuthPayload();
  if (!auth) {
    redirect(`/?login=1&next=${encodeURIComponent('/events/trainings/create')}`);
  }
  if (auth.role !== 'admin' && auth.role !== 'expert') {
    redirect('/events');
  }
  return <>{children}</>;
}
