'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { UserPlus, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

type MemberRole = 'org_owner' | 'org_admin' | 'org_editor';
type MemberStatus = 'active' | 'invited' | 'disabled';
type Member = { id: string; user_name: string | null; user_email: string; user_role: string; role: MemberRole; status: MemberStatus };

async function memberRequest(organizationId: string, init?: RequestInit): Promise<{ members: Member[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/members`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Member request failed.');
  return data;
}

export default function OrganizationMembersManagementPanel({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const queryKey = ['organization-members-management', organizationId] as const;
  const query = useQuery({ queryKey, queryFn: () => memberRequest(organizationId), enabled: Boolean(organizationId) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string; role: MemberRole }>({ defaultValues: { email: '', role: 'org_editor' } });
  const updateCache = (data: { members: Member[] }) => queryClient.setQueryData(queryKey, data);
  const add = useMutation({ mutationFn: (values: { email: string; role: MemberRole }) => memberRequest(organizationId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }), onSuccess: (data) => { updateCache(data); reset(); setOpen(false); setMessage('Member saved.'); } });
  const update = useMutation({ mutationFn: (member: Member) => memberRequest(organizationId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: member.id, role: member.role, status: member.status }) }), onSuccess: (data) => { updateCache(data); setMessage('Member updated.'); }, onError: (error) => setMessage(error.message) });
  const remove = useMutation({ mutationFn: (memberId: string) => memberRequest(organizationId, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: memberId }) }), onSuccess: (data) => { updateCache(data); setMessage('Member removed.'); }, onError: (error) => setMessage(error.message) });
  const members = query.data?.members || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team access</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">The owner and admins manage the organization; editors handle day-to-day content and operations.</p></div><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-slate-600 dark:text-slate-100"><UserPlus className="h-4 w-4" />Add member</button></div>
      {message && <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-200">{message}</p>}
      {query.isLoading ? <p className="mt-5 text-sm text-gray-500">Loading members...</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400"><tr><th className="px-3 py-2">Member</th><th className="px-3 py-2">Access</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-800">{members.map((member) => { const isOwner = member.role === 'org_owner'; return <tr key={member.id}><td className="px-3 py-3"><p className="font-semibold text-gray-900 dark:text-white">{member.user_name || 'Unnamed user'}</p><p className="text-xs text-gray-500 dark:text-slate-400">{member.user_email}</p></td><td className="px-3 py-3"><select value={member.role} disabled={isOwner} onChange={(event) => update.mutate({ ...member, role: event.target.value as MemberRole })} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="org_owner">Organization owner</option><option value="org_admin">Organization admin</option><option value="org_editor">Operations editor</option></select></td><td className="px-3 py-3"><select value={member.status} disabled={isOwner} onChange={(event) => update.mutate({ ...member, status: event.target.value as MemberStatus })} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="active">Active</option><option value="disabled">Disabled</option><option value="invited">Invited</option></select></td><td className="px-3 py-3 text-right">{isOwner ? <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Protected</span> : <button type="button" onClick={() => remove.mutate(member.id)} disabled={remove.isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300">Remove</button>}</td></tr>; })}</tbody></table></div>}
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950"><div className="flex justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Add organization member</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">Use an existing admin-verified expert email.</Dialog.Description></div><Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close></div><form onSubmit={handleSubmit((values) => add.mutate(values))} className="mt-5 space-y-4"><label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Expert email<input type="email" {...register('email', { required: 'Email is required.' })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />{errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}</label><label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">Role<select {...register('role')} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><option value="org_editor">Operations editor</option><option value="org_admin">Organization admin</option></select></label>{add.error && <p className="text-sm text-red-600">{add.error.message}</p>}<div className="flex justify-end gap-2"><Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</Dialog.Close><button type="submit" disabled={add.isPending} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">{add.isPending ? 'Adding...' : 'Add member'}</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    </section>
  );
}
