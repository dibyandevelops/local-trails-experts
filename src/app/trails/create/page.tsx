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
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Trails
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              GPX
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            {isEditMode ? 'Edit Trail' : 'Create Trail'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Upload routes, add photos, and keep Nepal’s trail network up to date.
          </p>
        </div>
      </section>

      {loadingUser ? (
        <p className="text-gray-600 dark:text-gray-300">Loading user...</p>
      ) : !user ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
          Unable to load user session. Please login again.
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isEditMode ? (
            user.role === 'admin' || user.role === 'expert' ? (
              trailId ? (
                <TrailEditForm trailId={trailId} />
              ) : null
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
                Only admins or the trail owner can edit trails.
              </div>
            )
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add up to 5 trails per submission. Fill each section and click &quot;Add another trail&quot; to include more, then submit.
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
