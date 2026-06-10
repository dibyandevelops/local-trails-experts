'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function JoinAdventureButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const { data: user = null, isLoading } = useCurrentUser();

  function handleClick() {
    if (isLoading) return;

    if (user?.role === 'admin') {
      router.push('/admin');
      return;
    }

    if (user?.role === 'expert') {
      router.push('/events/create');
      return;
    }

    if (user?.role === 'participant') {
      router.push('/trails');
      return;
    }

    const next =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/trails';
    window.dispatchEvent(
      new CustomEvent('open-register', {
        detail: {
          message: 'Create a participant account to explore trails and join rides.',
          next,
        },
      })
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Checking...' : 'Join Adventure'}
    </button>
  );
}
