'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Inbox, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
type ProgramRequest = { id: string; requester_name: string | null; requester_email: string; requester_phone: string | null; preferred_date: string; preferred_time: string | null; group_size: number; notes: string | null; expert_response_note: string | null; status: RequestStatus; program_title: string; expert_name: string | null; trail_name: string };

async function requestData(organizationId: string, init?: RequestInit): Promise<{ requests: ProgramRequest[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/ride-program-requests`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Request operation failed.');
  return data;
}

export default function OrganizationProgramRequestsPanel({ organizationId }: { organizationId: string }) {
  const [selected, setSelected] = useState<ProgramRequest | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ['organization-program-requests', organizationId] as const;
  const query = useQuery({ queryKey, queryFn: () => requestData(organizationId), enabled: Boolean(organizationId) });
  const { register, handleSubmit, reset } = useForm<{ status: RequestStatus; expert_response_note: string }>({ defaultValues: { status: 'pending', expert_response_note: '' } });
  const update = useMutation({
    mutationFn: (values: { status: RequestStatus; expert_response_note: string }) => requestData(organizationId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: selected?.id, ...values }) }),
    onSuccess: (data) => { queryClient.setQueryData(queryKey, data); setSelected(null); },
  });
  const openRequest = (request: ProgramRequest) => { setSelected(request); reset({ status: request.status, expert_response_note: request.expert_response_note || '' }); };
  const requests = query.data?.requests || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"><Inbox className="h-5 w-5" />Program requests</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Coordinate participant requests for organization-owned programs.</p></div>
      {query.isLoading ? <p className="mt-5 text-sm text-gray-500">Loading requests...</p> : requests.length === 0 ? <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">No participant requests yet.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400"><tr><th className="px-3 py-2">Participant</th><th className="px-3 py-2">Program</th><th className="px-3 py-2">Preferred date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-800">{requests.map((request) => <tr key={request.id}><td className="px-3 py-3"><p className="font-semibold text-gray-900 dark:text-white">{request.requester_name || request.requester_email}</p><p className="text-xs text-gray-500 dark:text-slate-400">{request.group_size} rider{request.group_size === 1 ? '' : 's'}</p></td><td className="px-3 py-3"><p className="text-gray-700 dark:text-slate-200">{request.program_title}</p><p className="text-xs text-gray-500 dark:text-slate-400">{request.expert_name || 'Expert'} · {request.trail_name}</p></td><td className="px-3 py-3 text-gray-600 dark:text-slate-300">{request.preferred_date}{request.preferred_time ? ` · ${request.preferred_time}` : ''}</td><td className="px-3 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold capitalize text-gray-700 dark:bg-slate-800 dark:text-slate-200">{request.status}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={() => openRequest(request)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-slate-600 dark:text-slate-100">Review</button></td></tr>)}</tbody></table></div>}
      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950"><div className="flex justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Review program request</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">{selected?.program_title}</Dialog.Description></div><Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close></div>{selected && <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-900 dark:text-slate-200"><p><strong>Participant:</strong> {selected.requester_name || selected.requester_email}</p><p><strong>Contact:</strong> {selected.requester_phone || selected.requester_email}</p><p><strong>Schedule:</strong> {selected.preferred_date} {selected.preferred_time || ''}</p><p><strong>Group:</strong> {selected.group_size}</p>{selected.notes && <p className="mt-2"><strong>Notes:</strong> {selected.notes}</p>}</div>}<form onSubmit={handleSubmit((values) => update.mutate(values))} className="mt-4 space-y-4"><label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Status<select {...register('status')} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">{(['pending', 'accepted', 'declined', 'completed', 'cancelled'] as RequestStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Response note<textarea rows={3} {...register('expert_response_note')} placeholder="Meeting details or next steps" className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>{update.error && <p className="text-sm text-red-600">{update.error.message}</p>}<div className="flex justify-end gap-2"><Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</Dialog.Close><button type="submit" disabled={update.isPending} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">{update.isPending ? 'Saving...' : 'Save response'}</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    </section>
  );
}
