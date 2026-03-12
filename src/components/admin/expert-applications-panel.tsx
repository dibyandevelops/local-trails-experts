import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminExpertApplications,
  sendAdminVerificationRequest,
  updateAdminExpertApplicationStatus,
  type ExpertApplication,
} from '@/services/admin/admin.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { getSportLabel } from '@/services/constants/sports';

const statusOptions = ['all', 'pending', 'approved', 'rejected'] as const;

export default function ExpertApplicationsPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('pending');

  const {
    data: applications = [],
    isLoading,
  } = useQuery<ExpertApplication[]>({
    queryKey: QUERY_KEYS.admin.expertApplications(status),
    queryFn: () => fetchAdminExpertApplications(status),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => updateAdminExpertApplicationStatus(id, 'approved'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.expertApplications(status) });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => updateAdminExpertApplicationStatus(id, 'rejected'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.expertApplications(status) });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      sendAdminVerificationRequest(id, message),
  });

  const handleRequestVerification = async (app: ExpertApplication) => {
    const message = window.prompt(
      `Request additional verification from ${app.name || app.email}:`
    );
    if (!message?.trim()) return;
    try {
      await verificationMutation.mutateAsync({ id: app.id, message: message.trim() });
      alert('Verification request sent.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send request.');
    }
  };

  const statusLabel = useMemo(() => {
    if (status === 'all') return 'All applications';
    return `${status.charAt(0).toUpperCase()}${status.slice(1)} applications`;
  }, [status]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Expert Applications</h2>
          <p className="text-sm text-gray-600">
            Review new expert applications and request additional verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Filter</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all'
                  ? 'All'
                  : `${option.charAt(0).toUpperCase()}${option.slice(1)}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-gray-600">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-gray-600">No {statusLabel.toLowerCase()}.</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-lg border border-gray-200 bg-gray-50/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {app.name || 'Expert'}
                    </p>
                    <p className="text-xs text-gray-500">{app.email}</p>
                    {app.city && (
                      <p className="text-xs text-gray-500 mt-1">{app.city}</p>
                    )}
                    {Array.isArray(app.sports) && app.sports.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {app.sports.map((sport) => (
                          <span
                            key={`${app.id}-${sport}`}
                            className="rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700"
                          >
                            {getSportLabel(sport)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {app.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => approveMutation.mutateAsync(app.id)}
                          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectMutation.mutateAsync(app.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestVerification(app)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Request verification
                        </button>
                      </>
                    )}
                    {app.status !== 'pending' && (
                      <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {app.status}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">
                  {app.credentials}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Submitted {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
