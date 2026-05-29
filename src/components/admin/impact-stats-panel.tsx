import { useQuery } from '@tanstack/react-query';

type ImpactStats = {
  totalTrails: number;
  totalEvents: number;
  upcomingEvents: number;
  totalRiders: number;
  activeOrganizations: number;
  activeCampaigns: number;
  fundedAmountNpr: number;
  targetAmountNpr: number;
  hazardousTrails: number;
};

export default function ImpactStatsPanel() {
  const { data, isLoading, isError } = useQuery<ImpactStats>({
    queryKey: ['admin-impact-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/impact-stats', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to fetch impact stats');
      }
      return payload.stats as ImpactStats;
    },
    staleTime: 30_000,
  });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Impact Snapshot</h2>
      <p className="mt-1 text-sm text-gray-600">
        Aggregate platform metrics for trails, riders, events, organizations, and funding.
      </p>

      {isLoading && <p className="mt-4 text-sm text-gray-600">Loading impact stats...</p>}
      {isError && (
        <p className="mt-4 text-sm text-red-700">
          Failed to load impact stats. Please retry shortly.
        </p>
      )}

      {data && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Published Trails" value={data.totalTrails.toLocaleString()} />
          <StatCard label="Total Riders" value={data.totalRiders.toLocaleString()} />
          <StatCard label="Total Events" value={data.totalEvents.toLocaleString()} />
          <StatCard label="Upcoming Events" value={data.upcomingEvents.toLocaleString()} />
          <StatCard label="Active Organizations" value={data.activeOrganizations.toLocaleString()} />
          <StatCard label="Active Campaigns" value={data.activeCampaigns.toLocaleString()} />
          <StatCard
            label="Funded (NPR)"
            value={data.fundedAmountNpr.toLocaleString()}
          />
          <StatCard
            label="Target (NPR)"
            value={data.targetAmountNpr.toLocaleString()}
          />
          <StatCard label="Hazardous Trails" value={data.hazardousTrails.toLocaleString()} />
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </article>
  );
}

