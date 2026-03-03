'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import TrailSubmissionForm from '@/components/feature-components/trail-submission-form';

export default function CreateTrailPage() {
  const router = useRouter();
  const { data: user = null, isLoading: loadingUser } = useCurrentUser();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-green-800">Create Trail</h1>

      {loadingUser ? (
        <p className="text-gray-600">Loading user...</p>
      ) : !user ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Unable to load user session. Please login again.
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {user?.role === 'expert' && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Expert-submitted trails require admin approval before they appear in event trail options.
            </p>
          )}

          <TrailSubmissionForm
            userRole={user.role}
            submitLabel={user.role === 'expert' ? 'Submit Trail for Approval' : 'Create Trail'}
            onSuccess={(data) => {
              if (data.requiresApproval) {
                return;
              }
              router.push(`/trails/${data.trail.id}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
