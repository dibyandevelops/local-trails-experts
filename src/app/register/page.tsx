'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RegisterForm from '@/components/auth/register-form';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const message = searchParams.get('message') || undefined;
      const next = searchParams.get('next') || undefined;
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: { message, next },
        })
      );
      router.replace(next || '/');
    } catch {
      // If something fails, keep the fallback form below.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-lg mx-auto">
      <RegisterForm notice={searchParams.get('message')} next={searchParams.get('next') || '/'} />
    </div>
  );
}
