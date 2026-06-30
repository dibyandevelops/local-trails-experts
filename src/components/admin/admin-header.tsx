'use client';

import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function AdminHeader() {
  const { data: user = null } = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Control center
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Admin Portal
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-slate-300">
            Review requests, manage organizations, publish operations, and keep public content clean.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-2 md:items-end">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              Google Login
            </div>
            {user.google_sub ? (
              <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                Connected
              </span>
            ) : (
              <Link
                href={`/api/auth/google/start?mode=connect&next=${encodeURIComponent('/admin')}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Connect Google
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
