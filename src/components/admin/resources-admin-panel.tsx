'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Wrench,
  CloudSun,
  Users,
} from 'lucide-react';
import type {
  CommunityResource,
  CommunityResourceCategory,
  CommunityResourcePricingType,
} from '@/types';

function YoutubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const CATEGORY_LABELS: Record<CommunityResourceCategory, { label: string; icon: any }> = {
  app: { label: 'Mobile / GPS App', icon: Smartphone },
  hardware_tool: { label: 'Hardware / Field Gear', icon: Wrench },
  youtube_channel: { label: 'YouTube Channel', icon: YoutubeIcon },
  weather_safety: { label: 'Weather & Emergency', icon: CloudSun },
  community_group: { label: 'Community Group', icon: Users },
};

export default function ResourcesAdminPanel() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CommunityResource | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'app' as CommunityResourceCategory,
    sport_type: 'all' as 'all' | 'mtb' | 'hiking' | 'bikepacking',
    pricing_type: 'free' as CommunityResourcePricingType,
    price_note: '',
    external_url: '',
    icon_or_logo_url: '',
    youtube_handle_or_channel_id: '',
    is_verified_by_locoxperts: true,
    is_featured: false,
    platforms: 'web, ios, android',
    tags: 'offline maps, gps',
    display_order: 0,
  });

  const { data: resources = [], isLoading } = useQuery<CommunityResource[]>({
    queryKey: ['admin-community-resources'],
    queryFn: async () => {
      const res = await fetch('/api/resources');
      if (!res.ok) throw new Error('Failed to fetch resources');
      const data = await res.json();
      return data.resources;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingResource
        ? `/api/resources/${editingResource.id}`
        : '/api/resources';
      const method = editingResource ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save resource');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-resources'] });
      queryClient.invalidateQueries({ queryKey: ['community-resources'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete resource');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-resources'] });
      queryClient.invalidateQueries({ queryKey: ['community-resources'] });
    },
  });

  function openCreateModal() {
    setEditingResource(null);
    setFormError(null);
    setFormData({
      title: '',
      description: '',
      category: 'app',
      sport_type: 'all',
      pricing_type: 'free',
      price_note: '',
      external_url: '',
      icon_or_logo_url: '',
      youtube_handle_or_channel_id: '',
      is_verified_by_locoxperts: true,
      is_featured: false,
      platforms: 'web, ios, android',
      tags: 'offline maps, navigation',
      display_order: 0,
    });
    setIsModalOpen(true);
  }

  function openEditModal(item: CommunityResource) {
    setEditingResource(item);
    setFormError(null);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      sport_type: item.sport_type,
      pricing_type: item.pricing_type,
      price_note: item.price_note || '',
      external_url: item.external_url,
      icon_or_logo_url: item.icon_or_logo_url || '',
      youtube_handle_or_channel_id: item.youtube_handle_or_channel_id || '',
      is_verified_by_locoxperts: item.is_verified_by_locoxperts,
      is_featured: item.is_featured,
      platforms: Array.isArray(item.platforms) ? item.platforms.join(', ') : '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      display_order: item.display_order || 0,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingResource(null);
    setFormError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const platformsArray = formData.platforms
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const tagsArray = formData.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    saveMutation.mutate({
      ...formData,
      platforms: platformsArray,
      tags: tagsArray,
      display_order: Number(formData.display_order) || 0,
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900 sm:rounded-2xl sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Curated Toolkit & Resources
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              {resources.length} items
            </span>
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Manage recommended apps, YouTube channels, safety radar, and gear visible to riders and hikers on the platform.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading resources...</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No resources found. Add the first one!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 pr-4">Title / Category</th>
                <th className="py-2.5 pr-4">Sport & Pricing</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">External Link</th>
                <th className="py-2.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {resources.map((item) => {
                const CatMeta = CATEGORY_LABELS[item.category] || {
                  label: item.category,
                  icon: Smartphone,
                };
                const IconComponent = CatMeta.icon;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            {item.title}
                            {item.is_featured && (
                              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {CatMeta.label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-xs font-semibold capitalize text-gray-800 dark:text-slate-200">
                        {item.sport_type}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                        {item.pricing_type}
                        {item.price_note ? ` (${item.price_note})` : ''}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        {item.is_verified_by_locoxperts ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-gray-400">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${item.title}"?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="p-1.5 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-gray-200 dark:border-slate-800 my-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingResource ? 'Edit Community Resource' : 'Add New Community Resource'}
            </h3>

            {formError && (
              <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Gaia GPS, Windy, GMBN"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Why is this useful for riders or hikers in Nepal?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as CommunityResourceCategory })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="app">Mobile / GPS App</option>
                    <option value="youtube_channel">YouTube Channel</option>
                    <option value="weather_safety">Weather & Emergency</option>
                    <option value="hardware_tool">Hardware / Field Gear</option>
                    <option value="community_group">Community Group</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Sport Type
                  </label>
                  <select
                    value={formData.sport_type}
                    onChange={(e) => setFormData({ ...formData, sport_type: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">All Disciplines</option>
                    <option value="mtb">MTB / Cycling</option>
                    <option value="hiking">Hiking & Trekking</option>
                    <option value="bikepacking">Bikepacking</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Pricing *
                  </label>
                  <select
                    value={formData.pricing_type}
                    onChange={(e) =>
                      setFormData({ ...formData, pricing_type: e.target.value as CommunityResourcePricingType })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="free">Free</option>
                    <option value="freemium">Freemium</option>
                    <option value="paid">Paid</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Price Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.price_note}
                    onChange={(e) => setFormData({ ...formData, price_note: e.target.value })}
                    placeholder="e.g. Free, $30/yr for offline"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  External URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    YouTube Handle (if applicable)
                  </label>
                  <input
                    type="text"
                    value={formData.youtube_handle_or_channel_id}
                    onChange={(e) =>
                      setFormData({ ...formData, youtube_handle_or_channel_id: e.target.value })
                    }
                    placeholder="e.g. @gmbn"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Platforms (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.platforms}
                  onChange={(e) => setFormData({ ...formData, platforms: e.target.value })}
                  placeholder="ios, android, web, garmin"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="offline maps, 3d, weather radar"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-5 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_verified_by_locoxperts}
                    onChange={(e) =>
                      setFormData({ ...formData, is_verified_by_locoxperts: e.target.checked })
                    }
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Verified by LocoXperts
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  Featured Highlight
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : editingResource ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
