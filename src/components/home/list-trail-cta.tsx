'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function ListTrailCta({
  title,
  label,
  description,
  authMessage,
}: {
  title: string;
  label: string;
  description: string;
  authMessage: string;
}) {
  const router = useRouter();
  const { data: user = null, isLoading } = useCurrentUser();

  const handleClick = () => {
    if (isLoading) return;
    if (user) {
      router.push('/upload');
      return;
    }

    window.dispatchEvent(
      new CustomEvent('open-register', {
        detail: { message: authMessage, next: '/upload' },
      })
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="group rounded-2xl border border-emerald-700 bg-emerald-800 p-4 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-80 dark:border-lime-300 dark:bg-lime-300 dark:text-slate-950 dark:hover:bg-lime-200"
    >
      <span className="block text-xs font-black uppercase tracking-[0.16em] text-emerald-100 dark:text-emerald-950/70">
        {title}
      </span>
      <span className="mt-1 block text-base font-black">
        {label} <span aria-hidden="true">→</span>
      </span>
      <span className="mt-1 block text-sm leading-5 text-emerald-50 dark:text-emerald-950/80">
        {description}
      </span>
    </button>
  );
}
