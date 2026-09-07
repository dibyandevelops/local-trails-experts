'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ExternalLink,
  Search,
  Sparkles,
  Smartphone,
  Wrench,
  CloudSun,
  Users,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Tag,
  Filter,
} from 'lucide-react';
import type {
  CommunityResource,
} from '@/types';

function YoutubeIcon({ className = 'h-5 w-5' }: { className?: string }) {
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

const CATEGORY_TABS: Array<{ id: string; label: string; icon: any }> = [
  { id: 'all', label: 'All Resources', icon: Compass },
  { id: 'app', label: 'GPS & Apps', icon: Smartphone },
  { id: 'youtube_channel', label: 'YouTube Channels', icon: YoutubeIcon },
  { id: 'weather_safety', label: 'Weather & Safety', icon: CloudSun },
  { id: 'hardware_tool', label: 'Gear & Tools', icon: Wrench },
  { id: 'community_group', label: 'Communities', icon: Users },
];

const SPORT_FILTERS = [
  { id: 'all', label: 'All Disciplines' },
  { id: 'mtb', label: 'MTB / Cycling' },
  { id: 'hiking', label: 'Hiking & Trekking' },
  { id: 'bikepacking', label: 'Bikepacking' },
];

const PRICING_FILTERS = [
  { id: 'all', label: 'All Pricing' },
  { id: 'free', label: 'Free Only' },
  { id: 'freemium', label: 'Freemium' },
  { id: 'paid', label: 'Paid / Pro' },
];

export default function ToolkitDirectoryView({
  initialResources = [],
}: {
  initialResources?: CommunityResource[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isFiltering =
    selectedCategory !== 'all' ||
    selectedSport !== 'all' ||
    selectedPricing !== 'all' ||
    Boolean(searchQuery.trim());

  const { data: resources = initialResources, isLoading } = useQuery<CommunityResource[]>({
    queryKey: ['community-resources', selectedCategory, selectedSport, selectedPricing, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSport !== 'all') params.set('sport_type', selectedSport);
      if (selectedPricing !== 'all') params.set('pricing_type', selectedPricing);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/resources?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch community resources');
      const data = await res.json();
      return data.resources;
    },
    initialData: !isFiltering ? initialResources : undefined,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 dark:bg-slate-950">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-white via-slate-50/80 to-slate-100/50 px-4 py-12 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 sm:py-16">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 backdrop-blur dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Curated Community Toolkit
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Apps, Tools & Channels for <span className="text-emerald-600 dark:text-emerald-400">Nepal Trails</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 dark:text-slate-300 sm:text-lg">
            A hand-picked directory of offline GPS navigation apps, mountain weather radars, repair tutorials, YouTube channels, and field tools tested for mountain biking and trekking across Nepal.
          </p>

          {/* Search Bar */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps, repair tutorials, offline maps, weather..."
                className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-lg shadow-gray-200/40 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-6xl px-4 pt-8">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none sm:justify-center">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-gray-200/80 py-3 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Sport:
            </span>
            {SPORT_FILTERS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSport(s.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedSport === s.id
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mr-1">
              Cost:
            </span>
            {PRICING_FILTERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPricing(p.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedPricing === p.id
                    ? 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Compass className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                No matching tools or resources
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Try loosening your filters or search terms.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSport('all');
                  setSelectedPricing('all');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((item) => {
                const isYouTube = item.category === 'youtube_channel';
                const isWeather = item.category === 'weather_safety';
                const isHardware = item.category === 'hardware_tool';

                return (
                  <article
                    key={item.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700/60"
                  >
                    <div>
                      {/* Card Header & Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${
                            isYouTube
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                              : isWeather
                              ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
                              : isHardware
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}>
                            {isYouTube ? (
                              <YoutubeIcon className="h-5 w-5" />
                            ) : isWeather ? (
                              <CloudSun className="h-5 w-5" />
                            ) : isHardware ? (
                              <Wrench className="h-5 w-5" />
                            ) : (
                              <Smartphone className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                              {item.category.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {item.sport_type}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                {item.pricing_type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.is_verified_by_locoxperts && (
                          <span
                            title="Verified by LocoXperts team for Nepal conditions"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h2 className="mt-3 text-lg font-bold text-gray-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                        {item.title}
                      </h2>

                      <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-3 dark:text-slate-300">
                        {item.description}
                      </p>

                      {/* Pricing Note */}
                      {item.price_note && (
                        <p className="mt-2 text-[11px] italic text-gray-500 dark:text-slate-400">
                          Note: {item.price_note}
                        </p>
                      )}

                      {/* Tags */}
                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 4).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-0.5 rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-slate-800/80 dark:text-slate-400"
                            >
                              <Tag className="h-2.5 w-2.5 text-gray-400" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer & Outbound Link */}
                    <div className="mt-5 border-t border-gray-100 pt-3.5 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        {/* Platforms */}
                        <div className="flex items-center gap-1.5">
                          {Array.isArray(item.platforms) &&
                            item.platforms.map((plat) => (
                              <span
                                key={plat}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              >
                                {plat}
                              </span>
                            ))}
                        </div>

                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white"
                        >
                          {isYouTube ? 'Open Channel' : 'Visit Resource'}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Suggestion Callout */}
        <section className="mt-16 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white shadow-xl dark:border-emerald-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-xl font-bold sm:text-2xl">
                Know a critical app, radar, or local channel we missed?
              </h3>
              <p className="max-w-xl text-sm text-emerald-50">
                Help riders and trekkers conquer Nepal with confidence. Suggest tools, guides, or your favorite mountain bike creators for our curated directory.
              </p>
            </div>
            <Link
              href="/faq"
              className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-800 shadow-md transition hover:bg-emerald-50 hover:shadow-lg"
            >
              Suggest a Resource
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
