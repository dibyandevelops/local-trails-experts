'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, ShieldCheck, Star, Users } from 'lucide-react';
import TrailRequestModal from '@/components/feature-components/trail-request/trail-request-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { fetchExperts } from '@/services/experts/experts.service';
import { fetchTrails, requestTrail } from '@/services/trails/trails.service';
import type { Trail, User } from '@/types';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300';
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-700/70 dark:bg-slate-950/70 dark:text-emerald-100 dark:hover:bg-emerald-950/45';
const cardClass =
  'border border-emerald-200/80 bg-white/92 shadow-sm dark:border-emerald-900/60 dark:bg-slate-950/72';

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'LX'
  );
}

function getExpertName(expert: User) {
  return expert.name || expert.email.split('@')[0] || 'Local expert';
}

function getExpertSpecialty(expert: User) {
  const sports = Array.isArray(expert.sports) ? expert.sports : [];
  if (sports.includes('mtb')) return 'MTB route support';
  if (sports.includes('cycling')) return 'Cycling support';
  if (sports.includes('hiking')) return 'Trail support';
  return 'Local ride support';
}

function getAssociatedTrailNames(expert: User) {
  return (expert.associated_trails || [])
    .map((trail) => trail.name)
    .filter(Boolean)
    .slice(0, 2);
}

export default function RideWithExpertsClient() {
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestExpertId, setRequestExpertId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitDisabledReason, setSubmitDisabledReason] = useState('');

  const { data: experts = [], isLoading: loadingExperts, isError } = useQuery({
    queryKey: QUERY_KEYS.experts.list({ verified: true }),
    queryFn: ({ signal }) => fetchExperts({ verified: true }, signal),
  });

  const { data: trails = [] } = useQuery<Trail[]>({
    queryKey: QUERY_KEYS.trails.list({}),
    queryFn: ({ signal }) => fetchTrails({}, signal),
    enabled: requestOpen,
  });

  const requestMutation = useMutation({
    mutationFn: (payload: {
      trailId: string;
      description: string;
      expert_user_id?: string;
      preferred_date: string;
      preferred_time?: string;
      offered_price_npr?: number | null;
      nearest_point?: string;
      needs_paid_shuttle?: boolean;
    }) =>
      requestTrail(payload.trailId, {
        description: payload.description,
        expert_user_id: payload.expert_user_id,
        preferred_date: payload.preferred_date,
        preferred_time: payload.preferred_time,
        offered_price_npr: payload.offered_price_npr,
        nearest_point: payload.nearest_point,
        needs_paid_shuttle: payload.needs_paid_shuttle,
      }),
    onSuccess: () => {
      setRequestMessage('Request submitted. The expert/admin team can review and coordinate the ride.');
      setRequestOpen(false);
      setRequestExpertId(null);
    },
    onError: (error) => {
      setRequestMessage(error instanceof Error ? error.message : 'Failed to submit request.');
    },
  });

  const trailOptions = useMemo(
    () =>
      trails.map((trail) => ({
        id: trail.id,
        name: trail.name,
        sport_type: trail.sport_type,
      })),
    [trails]
  );

  const featuredExpert = experts[0];
  const remainingExperts = experts.slice(1);

  const openRequest = (expert: User) => {
    setRequestExpertId(expert.id);
    setRequestMessage('');

    if (loadingUser) {
      setSubmitDisabledReason('Checking your account. Please try again in a second.');
      setRequestOpen(true);
      return;
    }

    if (!currentUser) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/ride-with-experts';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: {
            message: `Create a participant account to request a ride with ${getExpertName(expert)}.`,
            next,
          },
        })
      );
      return;
    }

    if (currentUser.role !== 'participant') {
      setSubmitDisabledReason('Ride requests are available for participants only.');
    } else {
      setSubmitDisabledReason('');
    }

    setRequestOpen(true);
  };

  return (
    <section className="container mx-auto space-y-6 px-4 py-8 md:py-10">
      <div className={`rounded-[2rem] ${cardClass} p-5 backdrop-blur md:p-7`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100">
            Ride with experts
          </span>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-gray-950 dark:text-white md:text-5xl">
            Request a ride with a local expert.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-slate-300">
            Pick an expert, choose your preferred trail and timing, then send a request. Public
            scheduled rides still live under Events.
          </p>
          {requestMessage && !requestOpen && (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100">
              {requestMessage}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/experts"
            className={secondaryButtonClass}
          >
            Browse all experts
          </Link>
          <Link
            href="/events?upcoming=true"
            className={primaryButtonClass}
          >
            Scheduled rides
          </Link>
        </div>
      </div>
      </div>

      {loadingExperts ? (
        <RideWithExpertsSkeleton />
      ) : isError ? (
        <EmptyState
          title="Experts could not load."
          description="Try the experts page while we reload this request surface."
          ctaHref="/experts"
          ctaLabel="Browse experts"
        />
      ) : experts.length === 0 ? (
        <EmptyState
          title="No verified experts are listed yet."
          description="Verified experts will appear here when their profiles are approved."
          ctaHref="/experts/join"
          ctaLabel="Apply as expert"
        />
      ) : (
        <>
          {featuredExpert && (
            <FeaturedExpertCard expert={featuredExpert} onRequest={() => openRequest(featuredExpert)} />
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {remainingExperts.map((expert) => (
              <ExpertRequestCard
                key={expert.id}
                expert={expert}
                onRequest={() => openRequest(expert)}
              />
            ))}
          </div>
        </>
      )}

      <TrailRequestModal
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            setRequestExpertId(null);
            setSubmitDisabledReason('');
            setRequestMessage('');
          }
        }}
        trailOptions={trailOptions}
        preselectedExpertId={requestExpertId}
        experts={experts.map((expert) => ({
          id: expert.id,
          name: expert.name,
          email: expert.email,
        }))}
        expertsBetaEnabled={EXPERTS_BETA_ENABLED}
        isSubmitting={requestMutation.isPending}
        submitDisabledReason={submitDisabledReason}
        message={requestMessage}
        onMessageChange={setRequestMessage}
        onSubmit={(payload) => requestMutation.mutate(payload)}
      />
    </section>
  );
}

function FeaturedExpertCard({ expert, onRequest }: { expert: User; onRequest: () => void }) {
  const name = getExpertName(expert);
  const trailNames = getAssociatedTrailNames(expert);

  return (
    <article className={`grid overflow-hidden rounded-[2rem] ${cardClass} lg:grid-cols-[0.78fr_1.22fr]`}>
      <div className="relative min-h-72 bg-emerald-950 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.22),transparent_36%),linear-gradient(135deg,rgba(6,78,59,0.94),rgba(2,6,23,0.98))]" />
        <div className="relative flex h-full flex-col justify-between">
          <ExpertAvatar expert={expert} name={name} size="large" />
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/30 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-50">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified expert
            </span>
            <p className="mt-3 text-sm font-semibold text-emerald-50/75">
              {expert.city || 'Kathmandu'} based expert
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
          Featured host
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950 dark:text-white md:text-5xl">
          Ride with {name}
        </h2>
        <p className="mt-4 line-clamp-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-slate-300">
          {expert.bio ||
            `${name} can help riders plan a local trail session based on preferred date, skill level, and route goals.`}
        </p>
        <ExpertMeta expert={expert} trailNames={trailNames} />
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRequest}
            className={primaryButtonClass}
          >
            Request ride with {name.split(' ')[0] || 'expert'}
          </button>
          <Link
            href={`/experts/${expert.id}`}
            className={secondaryButtonClass}
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}

function ExpertRequestCard({ expert, onRequest }: { expert: User; onRequest: () => void }) {
  const name = getExpertName(expert);
  const trailNames = getAssociatedTrailNames(expert);

  return (
    <article className={`flex h-full flex-col rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700/70 ${cardClass}`}>
      <div className="flex items-center gap-3">
        <ExpertAvatar expert={expert} name={name} />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Ride with
          </p>
          <h3 className="text-lg font-black text-gray-950 dark:text-white">{name}</h3>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-slate-300">
        {expert.bio || `${getExpertSpecialty(expert)} around ${expert.city || 'Kathmandu'}.`}
      </p>
      <ExpertMeta expert={expert} trailNames={trailNames} compact />
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button
          type="button"
          onClick={onRequest}
          className={`${primaryButtonClass} flex-1`}
        >
          Request ride
        </button>
        <Link
          href={`/experts/${expert.id}`}
          className={secondaryButtonClass}
        >
          Profile
        </Link>
      </div>
    </article>
  );
}

function ExpertMeta({
  expert,
  trailNames,
  compact = false,
}: {
  expert: User;
  trailNames: string[];
  compact?: boolean;
}) {
  return (
    <div className={`mt-5 grid gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-slate-300 sm:grid-cols-2`}>
      <p className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        <MapPin className="h-4 w-4" />
        {expert.city || 'Kathmandu'}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 font-semibold text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/25 dark:text-teal-100">
        <Users className="h-4 w-4" />
        {getExpertSpecialty(expert)}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
        <Star className="h-4 w-4" />
        {expert.review_count ? `${expert.average_rating?.toFixed(1) || '5.0'} rating` : 'New host'}
      </p>
      <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
        {trailNames.length > 0 ? trailNames.join(', ') : 'Choose your trail'}
      </p>
    </div>
  );
}

function ExpertAvatar({
  expert,
  name,
  size = 'normal',
}: {
  expert: User;
  name: string;
  size?: 'normal' | 'large';
}) {
  const sizeClass = size === 'large' ? 'h-24 w-24 text-2xl' : 'h-14 w-14 text-sm';

  return (
    <div
      className={`${sizeClass} overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-100 font-black text-emerald-900 shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/70 dark:text-emerald-100`}
    >
      {expert.profile_photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={expert.profile_photo_url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{getInitials(name)}</div>
      )}
    </div>
  );
}

function RideWithExpertsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-96 animate-pulse rounded-[2rem] border border-emerald-100 bg-white/70 dark:border-emerald-900/60 dark:bg-slate-950/70" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-3xl border border-emerald-100 bg-white/70 dark:border-emerald-900/60 dark:bg-slate-950/70"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-emerald-300 bg-white/85 p-8 text-center shadow-sm dark:border-emerald-800/70 dark:bg-slate-950/75">
      <h3 className="text-xl font-black text-gray-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-slate-300">
        {description}
      </p>
      <Link
        href={ctaHref}
        className={`mt-5 ${primaryButtonClass}`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
