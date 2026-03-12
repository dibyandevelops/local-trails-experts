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
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-green-800 dark:text-green-200">
        {isEditMode ? 'Edit Trail' : 'Create Trail'}
      </h1>

      {loadingUser ? (
        <p className="text-gray-600 dark:text-gray-300">Loading user...</p>
      ) : !user ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
          Unable to load user session. Please login again.
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
