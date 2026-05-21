import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAdminOrganizations, type OrganizationOption } from '@/services/admin/admin.service';

type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused' | 'archived';

type Campaign = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  trail_id: string | null;
  trail_name: string | null;
  title: string;
  target_amount_npr: string | number;
  raised_amount_npr: string | number;
  status: CampaignStatus;
  qr_image_url: string | null;
  payment_note: string | null;
};

export default function FundraisingCampaignsPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [trailId, setTrailId] = useState('');
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [raisedAmount, setRaisedAmount] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('draft');

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
          target_amount_npr: Number(targetAmount),
          raised_amount_npr: raisedAmount ? Number(raisedAmount) : 0,
          qr_image_url: qrImageUrl.trim() || null,
          payment_note: paymentNote.trim() || null,
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create campaign');
      return data;
    },
    onSuccess: async () => {
      await refetchCampaigns();
      setTitle('');
      setTargetAmount('');
      setRaisedAmount('');
      setTrailId('');
      setQrImageUrl('');
      setPaymentNote('');
      setStatus('draft');
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

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Fundraising Campaigns</h2>
      <p className="text-sm text-gray-600 mb-5">
        Create and manage support campaigns with QR and target progress.
      </p>
      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <select
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select organization</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
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
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Campaign title"
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
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!organizationId || !title.trim() || !targetAmount || createMutation.isPending}
          className="rounded-lg bg-green-700 text-white px-4 py-2 text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating...' : 'Create campaign'}
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {campaigns.map((campaign) => (
          <article
            key={campaign.id}
            className="rounded-lg border border-gray-200 bg-gray-50/70 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{campaign.title}</h3>
                <p className="text-xs text-gray-600">
                  {campaign.organization_name || 'Unknown org'}
                  {campaign.trail_name ? ` · ${campaign.trail_name}` : ''}
                </p>
                <p className="text-xs text-gray-600">
                  NPR {Number(campaign.raised_amount_npr || 0).toLocaleString()} / NPR{' '}
                  {Number(campaign.target_amount_npr || 0).toLocaleString()}
                </p>
              </div>
              <select
                value={campaign.status}
                onChange={(event) =>
                  statusMutation.mutate({
                    id: campaign.id,
                    nextStatus: event.target.value as CampaignStatus,
                  })
                }
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
