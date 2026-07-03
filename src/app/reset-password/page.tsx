import { Suspense } from 'react';
import ResetPasswordClient from './reset-password-client';

export const metadata = {
  title: 'Reset password | LocoXperts',
  description: 'Reset your LocoXperts account password.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-140px)] bg-slate-50 px-4 py-12 dark:bg-slate-950" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
