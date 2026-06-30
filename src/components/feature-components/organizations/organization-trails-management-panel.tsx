'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link2, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TrailAutocomplete from '@/components/ui/trail-autocomplete';
import type { TrailAutocompleteOption } from '@/components/ui/trail-autocomplete';
import TrailAssociationsSection from '@/components/ui/trail-associations-section';

type RelationType = 'built_by' | 'verified_by' | 'maintained_by';

type ManagedTrail = {
  relation_id: string;
  id: string;
  slug: string | null;
  name: string;
  location: string | null;
  difficulty: string | null;
  sport_type: string | null;
  relation_type: RelationType;
};

const relationLabels: Record<RelationType, string> = {
  built_by: 'Built by',
  verified_by: 'Verified by',
  maintained_by: 'Maintained by',
};

async function trailRequest(organizationId: string, init?: RequestInit): Promise<{ trails: ManagedTrail[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/trails`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Trail request failed.');
  return data;
}

async function searchTrails(search: string): Promise<TrailAutocompleteOption[]> {
  const params = new URLSearchParams({ pageSize: '30', sort: 'newest' });
  if (search.trim()) params.set('search', search.trim());
  const response = await fetch(`/api/trails?${params.toString()}`, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return [];
  return Array.isArray(data?.trails) ? data.trails : [];
}

export default function OrganizationTrailsManagementPanel({ organizationId, initialTrails = [] }: { organizationId: string; initialTrails?: ManagedTrail[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<TrailAutocompleteOption | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('maintained_by');
  const queryKey = ['organization-trails-management', organizationId] as const;
  const trailsQuery = useQuery({
    queryKey,
    queryFn: () => trailRequest(organizationId),
    initialData: { trails: initialTrails },
    enabled: Boolean(organizationId),
  });
  const searchQuery = useQuery({
    queryKey: ['organization-trail-search', search],
    queryFn: () => searchTrails(search),
    staleTime: 30000,
  });

  const existingRelationKeys = useMemo(
    () => new Set((trailsQuery.data?.trails || []).map((trail) => `${trail.id}:${trail.relation_type}`)),
    [trailsQuery.data?.trails]
  );
  const searchResults = (searchQuery.data || []).filter((trail) => !existingRelationKeys.has(`${trail.id}:${relationType}`));

  const add = useMutation({
    mutationFn: () => trailRequest(organizationId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trail_id: selectedTrail?.id, relation_type: relationType }),
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setSelectedTrail(null);
      setSearch('');
    },
  });

  const remove = useMutation({
    mutationFn: (relationId: string) => trailRequest(organizationId, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relation_id: relationId }),
    }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  const trails = trailsQuery.data?.trails || [];

  return (
    <TrailAssociationsSection
      title="Trails this organization works on"
      description="Link trails this organization builds, verifies, or maintains. Other organizations can also work on the same trail with their own relationship."
      trails={trails.map((trail) => ({
        id: `${trail.id}:${trail.relation_type}`,
        name: `${trail.name} · ${relationLabels[trail.relation_type]}`,
        href: trail.slug ? `/trails/${trail.slug}` : `/trails/${trail.id}`,
      }))}
      emptyText="No trails linked yet."
      aside={
        <>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            {trails.length} linked
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-emerald-700/70 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/80"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[10px] font-black leading-none text-white dark:bg-emerald-500 dark:text-slate-950">T</span>
            Manage trails
          </button>
        </>
      }
    >
      {trails.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {trails.map((trail) => (
            <div key={trail.relation_id} className="rounded-xl border border-gray-100 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{trail.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {relationLabels[trail.relation_type]} · {trail.location || 'Location not set'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(trail.relation_id)}
                  disabled={remove.isPending}
                  className="rounded-lg border border-red-200 p-2 text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-300"
                  aria-label={`Remove ${trail.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Manage trails</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Search approved trails, choose the organization relationship, and link only trails this team actively builds, verifies, or maintains. A trail can have multiple organizations, but the same organization cannot duplicate the same relationship.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <TrailAutocomplete
                  label="Find trail"
                  query={search}
                  value={selectedTrail}
                  options={searchResults}
                  isLoading={searchQuery.isLoading}
                  placeholder="Search approved trails by name or location"
                  helperText="Showing up to 30 approved trails. Type to narrow the list."
                  onQueryChange={setSearch}
                  onChange={setSelectedTrail}
                />
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Relation
                  <select
                    value={relationType}
                    onChange={(event) => setRelationType(event.target.value as RelationType)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {Object.entries(relationLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Trails already linked with the selected relationship are hidden. Choose a different relationship if this organization has another role on the same trail.
                </p>
                <button
                  type="button"
                  onClick={() => add.mutate()}
                  disabled={!selectedTrail || add.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950"
                >
                  <Link2 className="h-4 w-4" />
                  {add.isPending ? 'Linking...' : 'Link trail'}
                </button>
              </div>
              {add.error && <p className="mt-3 text-sm text-red-600 dark:text-red-300">{add.error.message}</p>}
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Linked trails</h3>
              {trails.length === 0 ? (
                <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                  No trails linked yet.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {trails.map((trail) => (
                    <div key={`modal-${trail.relation_id}`} className="rounded-xl border border-gray-100 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{trail.name}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            {relationLabels[trail.relation_type]} · {trail.location || 'Location not set'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove.mutate(trail.relation_id)}
                          disabled={remove.isPending}
                          className="rounded-lg border border-red-200 p-2 text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-300"
                          aria-label={`Remove ${trail.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </TrailAssociationsSection>
  );
}
