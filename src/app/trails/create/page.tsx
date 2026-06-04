'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import MultiTrailSubmissionForm from '@/components/feature-components/trail-submission-form/MultiTrailSubmissionForm';
import { useSearchParams } from 'next/navigation';
import TrailEditForm from '@/components/feature-components/trail-submission-form/TrailEditForm';

export default function CreateTrailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trailId = searchParams.get('trailId');
  const isEditMode = Boolean(trailId);
  const { data: user = null, isLoading: loadingUser } = useCurrentUser();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-6 shadow-sm dark:border-emerald-800/60 dark:from-slate-950 dark:via-emerald-950/35 dark:to-lime-950/20 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-400/10" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Trails
            </span>
            <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              GPX
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-950 dark:text-slate-50 sm:text-4xl">
            {isEditMode ? 'Edit Trail' : 'Create Trail'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
            Upload routes, add photos, and keep Nepal’s trail network up to date.
          </p>
        </div>
      </section>

      {loadingUser ? (
        <div className="rounded-3xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          Loading user...
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200">
          Unable to load user session. Please login again.
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/15 dark:to-slate-900 sm:p-6">
          {isEditMode ? (
            user.role === 'admin' || user.role === 'expert' ? (
              trailId ? (
                <TrailEditForm trailId={trailId} />
              ) : null
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200">
                Only admins or the trail owner can edit trails.
              </div>
            )
          ) : (
            <>
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                Add as many trails as needed in one submission. Fill each section and click &quot;Add another trail&quot; to include more, then submit.
              </p>
              <MultiTrailSubmissionForm
                userRole={user.role}
                submitLabel="Create Trails"
                onSuccess={(data) => {
                  if (data.requiresApproval) {
                    return;
                  }
                  if (data.trail?.id) {
                    router.push(`/trails/${data.trail.id}`);
                  }
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
