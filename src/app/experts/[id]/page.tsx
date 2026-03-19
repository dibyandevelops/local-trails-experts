'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Event, User } from '@/types';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  fetchExpertEvents,
  fetchExperts,
  fetchExpertStravaSummary,
} from '@/services/experts/experts.service';
import { getSportLabel } from '@/services/constants/sports';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { useCurrentUser } from '@/hooks/use-current-user';
import VerificationDetailsContent, {
  hasVerificationDetails,
} from '@/components/ui/verification-details-content';

interface ExpertDetail extends User {
  events: Event[];
}

export default function ExpertDetailPage() {
  const params = useParams<{ id: string }>();
  const expertId = params?.id;
  const { data: currentUser } = useCurrentUser();

  const { data: expert, isLoading: loading } = useQuery<ExpertDetail | null>({
    queryKey: ['expert-detail', expertId || ''],
    queryFn: async ({ signal }) => {
      if (!expertId) return null;
      const [experts, events] = await Promise.all([
        fetchExperts({ id: expertId }, signal),
        fetchExpertEvents(expertId, signal),
      ]);
      const base = (experts || []).find((e: User) => e.id === expertId);
      if (!base) return null;
      return {
        ...(base as User),
        events: events || [],
      };
    },
    enabled: !!expertId,
  });
  const { data: strava } = useQuery({
    queryKey: QUERY_KEYS.experts.strava(expertId || ''),
    queryFn: ({ signal }) => fetchExpertStravaSummary(expertId || '', signal),
    enabled: !!expertId,
  });

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-slate-300">
        Loading...
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-slate-300 mb-4">Expert not found.</p>
        <Link
          href="/experts"
          className="inline-flex px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
        >
          Back to experts
        </Link>
      </div>
    );
  }

  const upcomingEvents = expert.events.filter(
    (e) => new Date(e.event_date) >= new Date()
  );
  const sports = Array.isArray(expert.sports) ? expert.sports : [];
  const stravaProfileId = strava?.profile?.id;
  const initials =
    (expert.name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'EX';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-100 p-6 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/60 dark:to-emerald-900/40">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-emerald-200">
          Expert Showcase
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-1 text-xs text-gray-600 dark:text-slate-300">
              <Link
                href="/experts"
                className="underline hover:text-green-700 dark:hover:text-emerald-200"
              >
                All experts
              </Link>{' '}
              / Profile
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-white/60 bg-white/80 text-gray-700 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
                {expert.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={expert.profile_photo_url}
                    alt={expert.name || 'Expert'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {expert.name || 'Local Expert'}
              </h1>
              {expert.is_verified_expert ? (
                <span className="inline-flex items-center rounded-full bg-green-700 px-3 py-1 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-emerald-950">
                  Verified Expert
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                  Pending Verification
                </span>
              )}
              {strava?.connected && stravaProfileId && currentUser?.id === expertId && (
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-100">
                  Strava Verified{' '}
                  <span className="ml-1 text-[10px] font-medium text-orange-700/80 dark:text-orange-200/80">
                    (Powered by Strava)
                  </span>
                </span>
              )}
            </div>
            {expert.city && (
              <p className="mt-1 text-sm text-gray-700 dark:text-slate-200">
                {expert.city}
              </p>
            )}
            {expert.bio && (
              <p className="mt-3 max-w-2xl text-sm text-gray-700 dark:text-slate-200">
                {expert.bio}
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
              {strava?.connected && stravaProfileId && currentUser?.id === expertId && (
                <a
                  href={`https://www.strava.com/athletes/${stravaProfileId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 shadow-sm transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-100 dark:hover:bg-orange-900/60"
                >
                  Check on Strava
                </a>
              )}
              <Link
                href={`/events?expert=${expert.id}`}
                className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
              >
                View All Events
              </Link>
            </div>
          </div>
        </div>
        {sports.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sports.map((sport) => (
              <span
                key={sport}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100"
              >
                {getSportLabel(sport)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/40">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-300">
              Total Events
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {expert.events.length}
            </p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/40">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-300">
              Upcoming
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {upcomingEvents.length}
            </p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/40">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-300">
              Sports
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {sports.length}
            </p>
          </div>
        </div>
      </section>

      {hasVerificationDetails({
        yearsExperience: expert.verification_years_experience,
        certifications: expert.verification_certifications,
        guidingHistory: expert.verification_guiding_history,
        safetyTraining: expert.verification_safety_training,
        links: expert.verification_links,
      }) && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Verification Details
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Additional profile details shared by the expert.
          </p>
          <div className="mt-4">
            <VerificationDetailsContent
              yearsExperience={expert.verification_years_experience}
              certifications={expert.verification_certifications}
              guidingHistory={expert.verification_guiding_history}
              safetyTraining={expert.verification_safety_training}
              links={expert.verification_links}
            />
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
          Upcoming events with {expert.name || 'this expert'}
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            No upcoming events listed yet. Check back soon or browse other
            events.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {event.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {format(new Date(event.event_date), 'PPP p')}
                    {event.city ? ` • ${event.city}` : ''}
                  </p>
                  {event.sport_type && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {getSportLabel(event.sport_type)}
                    </p>
                  )}
                  {event.meeting_point && (
                    <p className="text-xs text-gray-600 mt-1 dark:text-slate-300">
                      Meeting point: {event.meeting_point}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {event.price_npr > 0 && (
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      NPR {event.price_npr}
                    </p>
                  )}
                  <Link
                    href={`/events?city=${encodeURIComponent(
                      event.city || ''
                    )}&sport=${encodeURIComponent(event.sport_type || '')}`}
                    className="inline-flex px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                  >
                    View in events
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
          All events by this expert
        </h2>
        {expert.events.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            No events listed yet for this expert.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
            {expert.events.map((event) => (
              <li key={event.id}>
                <span className="font-medium">{event.title}</span>
                {event.city && (
                  <span className="text-gray-500 dark:text-slate-400">
                    {' '}
                    • {event.city}
                  </span>
                )}
                {event.sport_type && (
                  <span className="text-gray-500 dark:text-slate-400">
                    {' '}
                    • {getSportLabel(event.sport_type)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
