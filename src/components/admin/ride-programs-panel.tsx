'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateText from '@/components/ui/date-text';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchAdminRidePrograms,
  updateAdminRideProgramVisibility,
  type AdminRideProgram,
  type AdminRideProgramRequest,
} from '@/services/admin/admin.service';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {active ? 'Active' : 'Paused'}
    </span>
  );
}

function RequestStatusBadge({ status }: { status: AdminRideProgramRequest['status'] }) {
  const className =
    status === 'pending'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
      : status === 'accepted'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
        : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${className}`}>
      {status}
    </span>
  );
}

function getProgramTypeLabel(programType?: string | null) {
  switch (programType) {
    case 'training':
      return 'MTB training';
    case 'skills_clinic':
      return 'Skills clinic';
    case 'tour':
      return 'Local tour';
    default:
      return 'Guided ride';
  }
}

export default function RideProgramsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.admin.ridePrograms,
    queryFn: fetchAdminRidePrograms,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ program, isActive }: { program: AdminRideProgram; isActive: boolean }) =>
      updateAdminRideProgramVisibility(program.id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.ridePrograms });
    },
  });

  const programs = data?.programs || [];
  const requests = data?.requests || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ride with Experts</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Admin visibility for expert ride programs and participant requests.
          </p>
        </div>
        <Link
          href="/ride-with-experts"
          className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Public page
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">Loading ride programs...</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-300">
          {error instanceof Error ? error.message : 'Unable to load ride programs.'}
        </p>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Programs</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {programs.length}
              </span>
            </div>
            {programs.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-slate-300">No ride programs yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Program</th>
                      <th className="px-3 py-2">Expert</th>
                      <th className="px-3 py-2">Trail</th>
                      <th className="px-3 py-2">Requests</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((program) => (
                      <tr key={program.id} className="border-t border-gray-200 dark:border-slate-700">
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-slate-100">{program.title}</p>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                              {getProgramTypeLabel(program.program_type)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {program.price_npr ? `NPR ${program.price_npr}` : 'No price'} · Up to {program.max_group_size} riders
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          <p>{program.expert_name || 'Expert'}</p>
                          <p>{program.expert_email}</p>
                          {program.organization_name && (
                            <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">
                              {program.organization_name}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          {program.trail_slug ? (
                            <Link href={`/trails/${program.trail_slug}`} className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
                              {program.trail_name}
                            </Link>
                          ) : (
                            <span>{program.trail_name}</span>
                          )}
                          <p>{program.trail_location || 'Location not set'}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          <p>{program.request_count} total</p>
                          <p>{program.pending_request_count} pending</p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge active={program.is_active} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              toggleMutation.mutate({ program, isActive: !program.is_active })
                            }
                            disabled={toggleMutation.isPending}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            {program.is_active ? 'Pause' : 'Make active'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Recent requests</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {requests.length}
              </span>
            </div>
            {requests.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-slate-300">No ride program requests yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Request</th>
                      <th className="px-3 py-2">Participant</th>
                      <th className="px-3 py-2">Expert</th>
                      <th className="px-3 py-2">Preferred</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-t border-gray-200 align-top dark:border-slate-700">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">{request.program_title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{request.trail_name}</p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500">
                            <DateText value={request.created_at} pattern="PP p" />
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          <p>{request.requester_name || 'Participant'}</p>
                          <p>{request.requester_email}</p>
                          {request.requester_phone && <p>{request.requester_phone}</p>}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          <p>{request.expert_name || 'Expert'}</p>
                          <p>{request.expert_email}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          <p>{request.preferred_date}</p>
                          {request.preferred_time && <p>{request.preferred_time}</p>}
                          <p>Group {request.group_size}</p>
                          {request.offered_price_npr ? <p>NPR {request.offered_price_npr}</p> : null}
                        </td>
                        <td className="px-3 py-3">
                          <RequestStatusBadge status={request.status} />
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                          {request.notes && <p className="max-w-[240px]">Participant: {request.notes}</p>}
                          {request.expert_response_note && (
                            <p className="mt-1 max-w-[240px] text-emerald-700 dark:text-emerald-300">
                              Expert: {request.expert_response_note}
                            </p>
                          )}
                          {!request.notes && !request.expert_response_note && <span>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
