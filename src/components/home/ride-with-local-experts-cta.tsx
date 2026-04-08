'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchTrails, requestTrail } from '@/services/trails/trails.service';
import { fetchVerifiedExperts } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import TrailRequestModal from '@/components/feature-components/trail-request/trail-request-modal';
import type { Trail, User } from '@/types';

export default function RideWithLocalExpertsCta() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { data: user = null, isLoading: loadingUser } = useCurrentUser();

  const { data: trails = [] } = useQuery<Trail[]>({
    queryKey: QUERY_KEYS.trails.list({}),
    queryFn: ({ signal }) => fetchTrails({}, signal),
    enabled: open,
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    enabled: open && !EXPERTS_BETA_ENABLED,
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
    }) =>
      requestTrail(payload.trailId, {
        description: payload.description,
        expert_user_id: payload.expert_user_id,
        preferred_date: payload.preferred_date,
        preferred_time: payload.preferred_time,
        offered_price_npr: payload.offered_price_npr,
        nearest_point: payload.nearest_point,
      }),
    onSuccess: () => {
      setMessage('Request submitted successfully.');
      setOpen(false);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to submit request.');
    },
  });

  const trailOptions = useMemo(
    () => trails.map((trail) => ({ id: trail.id, name: trail.name })),
    [trails]
  );

  const handleOpen = () => {
    if (loadingUser) {
      setMessage('Checking your account. Please try again in a second.');
      return;
    }
    if (!user) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: {
            message: 'Create a participant account to request a trail activity.',
            next,
          },
        })
      );
      return;
    }
    if (user.role !== 'participant') {
      setMessage('Trail requests are available for participants.');
      return;
    }
    setMessage('');
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-700/60 dark:hover:bg-emerald-950/30 md:text-base"
      >
        Ride with local experts →
      </button>
      {message && !open && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{message}</p>
      )}
      <TrailRequestModal
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setMessage('');
        }}
        trailOptions={trailOptions}
        experts={experts}
        expertsBetaEnabled={EXPERTS_BETA_ENABLED}
        isSubmitting={requestMutation.isPending}
        message={message}
        onMessageChange={setMessage}
        onSubmit={(payload) => requestMutation.mutate(payload)}
      />
    </>
  );
}
