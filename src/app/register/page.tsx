'use client';

import { useSearchParams } from 'next/navigation';
import RegisterForm from '@/components/auth/register-form';

export default function RegisterPage() {
  const searchParams = useSearchParams();

  return (
    <div className="max-w-lg mx-auto">
      <RegisterForm notice={searchParams.get('message')} next={searchParams.get('next') || '/'} />
    </div>
  );
}
