import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAdminOrganizations, type OrganizationOption } from '@/services/admin/admin.service';
import AppDialog from '@/components/ui/app-dialog';

type CampaignStatus =
  | 'draft'
  | 'active'
  | 'looking_for_funds'
  | 'completed'
  | 'paused'
  | 'archived';

const CAMPAIGN_STATUS_OPTIONS: Array<{ value: CampaignStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'looking_for_funds', label: 'Looking for funds' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
];

type Campaign = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  trail_id: string | null;
  trail_name: string | null;
  title: string;
  description: string | null;
  target_amount_npr: string | number;
  raised_amount_npr: string | number;
  status: CampaignStatus;
  qr_image_url: string | null;
  payment_note: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export default function FundraisingCampaignsPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [trailId, setTrailId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [raisedAmount, setRaisedAmount] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editOrganizationId, setEditOrganizationId] = useState('');
  const [editTrailId, setEditTrailId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editRaisedAmount, setEditRaisedAmount] = useState('');
  const [editQrImageUrl, setEditQrImageUrl] = useState('');
  const [editPaymentNote, setEditPaymentNote] = useState('');
  const [editStatus, setEditStatus] = useState<CampaignStatus>('draft');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const { data: organizations = [] } = useQuery<OrganizationOption[]>({
    queryKey: ['admin-organizations'],
    queryFn: fetchAdminOrganizations,
  });

  const { data: trails = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['admin-trails-lite'],
    queryFn: async () => {
      const response = await fetch('/api/trails?pageSize=200&sort=newest');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch trails');
      return (data?.trails || []).map((t: any) => ({ id: t.id as string, name: t.name as string }));
    },
  });

  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery<Campaign[]>({
    queryKey: ['admin-fundraising-campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/admin/fundraising-campaigns');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch campaigns');
      return data?.campaigns || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/fundraising-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          trail_id: trailId || null,
          title: title.trim(),
          description: description.trim() || null,
          target_amount_npr: Number(targetAmount),
          raised_amount_npr: raisedAmount ? Number(raisedAmount) : 0,
          qr_image_url: qrImageUrl.trim() || null,
          payment_note: paymentNote.trim() || null,
          status,
          starts_at: startsAt || null,
          ends_at: endsAt || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create campaign');
      return data;
    },
    onSuccess: async () => {
      await refetchCampaigns();
      setTitle('');
      setDescription('');
      setTargetAmount('');
      setRaisedAmount('');
      setTrailId('');
      setQrImageUrl('');
      setPaymentNote('');
      setStatus('draft');
      setStartsAt('');
      setEndsAt('');
      setCreateOpen(false);
      setMessage('Campaign created.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to create campaign.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: CampaignStatus }) => {
      const response = await fetch('/api/admin/fundraising-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update campaign');
      return data;
    },
    onSuccess: async () => {
      await refetchCampaigns();
      setMessage('Campaign updated.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update campaign.');
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/fundraising-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCampaignId,
          organization_id: editOrganizationId,
          trail_id: editTrailId || null,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          target_amount_npr: Number(editTargetAmount),
          raised_amount_npr: Number(editRaisedAmount || 0),
          qr_image_url: editQrImageUrl.trim() || null,
          payment_note: editPaymentNote.trim() || null,
          status: editStatus,
          starts_at: editStartsAt || null,
          ends_at: editEndsAt || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update campaign');
      return data;
    },
    onSuccess: async () => {
      await refetchCampaigns();
      setMessage('Campaign updated.');
      setEditingCampaignId(null);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update campaign.');
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const response = await fetch('/api/admin/fundraising-campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to delete campaign');
      return data?.campaign as Pick<Campaign, 'id' | 'title'>;
    },
    onSuccess: async (campaign) => {
      await refetchCampaigns();
      setMessage(`${campaign.title} deleted.`);
      setDeleteTarget(null);
      if (editingCampaignId === campaign.id) {
        setEditingCampaignId(null);
      }
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to delete campaign.');
    },
  });

  const openEdit = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setEditOrganizationId(campaign.organization_id || '');
    setEditTrailId(campaign.trail_id || '');
    setEditTitle(campaign.title || '');
    setEditDescription(campaign.description || '');
    setEditTargetAmount(String(campaign.target_amount_npr || ''));
    setEditRaisedAmount(String(campaign.raised_amount_npr || '0'));
    setEditQrImageUrl(campaign.qr_image_url || '');
    setEditPaymentNote(campaign.payment_note || '');
    setEditStatus(campaign.status);
    setEditStartsAt(campaign.starts_at ? campaign.starts_at.slice(0, 10) : '');
    setEditEndsAt(campaign.ends_at ? campaign.ends_at.slice(0, 10) : '');
  };

  const closeEdit = () => setEditingCampaignId(null);

  const formatMoney = (value: string | number) =>
    Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const formatDate = (value: string | null) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString();
  };

  const createCampaignForm = (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select trail builder</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}{org.is_active ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
        <select
          value={trailId}
          onChange={(event) => setTrailId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Optional trail</option>
          {trails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as CampaignStatus)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {CAMPAIGN_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Campaign title"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Campaign description"
          rows={3}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
        />
        <input
          type="number"
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
          placeholder="Target amount NPR"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={raisedAmount}
          onChange={(event) => setRaisedAmount(event.target.value)}
          placeholder="Raised amount NPR (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={qrImageUrl}
          onChange={(event) => setQrImageUrl(event.target.value)}
          placeholder="QR image URL (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
        />
        <input
          value={paymentNote}
          onChange={(event) => setPaymentNote(event.target.value)}
          placeholder="Payment note (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="Campaign start date"
        />
        <input
          type="date"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="Campaign end date"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setCreateOpen(false)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!organizationId || !title.trim() || !targetAmount || createMutation.isPending}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating...' : 'Create campaign'}
        </button>
      </div>
    </div>
  );

  const editCampaignForm = (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={editOrganizationId}
          onChange={(event) => setEditOrganizationId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select trail builder</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}{org.is_active ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
        <select
          value={editTrailId}
          onChange={(event) => setEditTrailId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Optional trail</option>
          {trails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
        <input
          value={editTitle}
          onChange={(event) => setEditTitle(event.target.value)}
          placeholder="Campaign title"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={editStatus}
          onChange={(event) => setEditStatus(event.target.value as CampaignStatus)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {CAMPAIGN_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <textarea
          value={editDescription}
          onChange={(event) => setEditDescription(event.target.value)}
          placeholder="Campaign description"
          rows={3}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
        />
        <input
          type="number"
          value={editTargetAmount}
          onChange={(event) => setEditTargetAmount(event.target.value)}
          placeholder="Target amount"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={editRaisedAmount}
          onChange={(event) => setEditRaisedAmount(event.target.value)}
          placeholder="Raised amount"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={editQrImageUrl}
          onChange={(event) => setEditQrImageUrl(event.target.value)}
          placeholder="QR image URL"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
        />
        <input
          value={editPaymentNote}
          onChange={(event) => setEditPaymentNote(event.target.value)}
          placeholder="Payment note"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={editStartsAt}
          onChange={(event) => setEditStartsAt(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="Campaign start date"
        />
        <input
          type="date"
          value={editEndsAt}
          onChange={(event) => setEditEndsAt(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="Campaign end date"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={closeEdit}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => updateCampaignMutation.mutate()}
          disabled={
            updateCampaignMutation.isPending ||
            !editOrganizationId ||
            !editTitle.trim() ||
            !editTargetAmount ||
            Number(editTargetAmount) <= 0
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {updateCampaignMutation.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
            Fundraising Campaigns
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Create and manage support campaigns with QR and target progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Create campaign
        </button>
      </div>
      {message && (
        <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {message}
        </p>
      )}

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Campaign list
          </h3>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
            {campaigns.length} total
          </span>
        </div>
        {campaigns.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            No campaigns created yet.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Trail Builder</th>
                  <th className="px-4 py-3">Trail</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {campaign.title}
                      </p>
                      {campaign.description && (
                        <p className="mt-1 max-w-xs text-xs text-gray-600 dark:text-slate-300">
                          {campaign.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      {campaign.organization_name || 'Unknown trail builder'}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      {campaign.trail_name || 'No trail'}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      <p>NPR {formatMoney(campaign.raised_amount_npr)}</p>
                      <p>of NPR {formatMoney(campaign.target_amount_npr)}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      <p>Start: {formatDate(campaign.starts_at)}</p>
                      <p>End: {formatDate(campaign.ends_at)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={campaign.status}
                        onChange={(event) =>
                          statusMutation.mutate({
                            id: campaign.id,
                            nextStatus: event.target.value as CampaignStatus,
                          })
                        }
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {CAMPAIGN_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(campaign)}
                          className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-950/70"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(campaign)}
                          disabled={deleteCampaignMutation.isPending}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AppDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create campaign"
        description="Set campaign ownership, target, public content, and payment details."
        maxWidthClassName="max-w-3xl"
      >
        {createCampaignForm}
      </AppDialog>
      <AppDialog
        open={Boolean(editingCampaignId)}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
        title="Edit campaign"
        description="Update campaign content, status, ownership, and progress."
        maxWidthClassName="max-w-3xl"
      >
        {editCampaignForm}
      </AppDialog>
      <AppDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete campaign"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Delete {deleteTarget.title}?</p>
              <p className="mt-2 text-xs leading-5">
                This removes the campaign from public campaign pages and deletes its progress,
                payment note, QR reference, and date metadata.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteCampaignMutation.mutate(deleteTarget)}
                disabled={deleteCampaignMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete campaign'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  );
}
