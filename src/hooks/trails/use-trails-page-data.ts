'use client';

import { useMemo } from 'react';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { Trail, User } from '@/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { fetchVerifiedExperts } from '@/services/events/events.service';
import {
  deleteTrail,
  fetchTrailMapById,
  fetchTrailsPaginated,
  hideTrail,
  requestTrail,
  type PaginatedTrailsResponse,
  type TrailFilters,
  type TrailRequestPayload,
  unhideTrail,
} from '@/services/trails/trails.service';
import {
  cancelParticipantTrailRequest,
  fetchGuideTrails,
  fetchParticipantTrailRequests,
  fetchSavedTrails,
  setTrailSaved,
  updateGuideTrails,
  type GuideTrailsResponse,
  type ParticipantTrailRequestsResponse,
  type SavedTrailsResponse,
} from '@/services/trails/trails-page.service';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

const GUIDE_TRAILS_QUERY_KEY = ['guide-associated-trails'] as const;
const PARTICIPANT_REQUESTS_QUERY_KEY = ['participant-trail-requests'] as const;
const TRAILS_LIST_STALE_TIME_MS = 5 * 60 * 1000;

type TrailsPageParam = { offset: number; limit: number };

type TrailRequestMutationPayload = TrailRequestPayload & { trailId: string };

type UseTrailsPageDataOptions = {
  filterQuery: TrailFilters;
  pageSize: number;
  mapTrailId: string | null;
  mapOpen: boolean;
  mapTrailSummary: Trail | null;
  onToast: (title: string, description: string) => void;
  onRequestMessage: (message: string) => void;
  onRequestSuccess: () => void;
};

export function useTrailsPageData({
  filterQuery,
  pageSize,
  mapTrailId,
  mapOpen,
  mapTrailSummary,
  onToast,
  onRequestMessage,
  onRequestSuccess,
}: UseTrailsPageDataOptions) {
  const queryClient = useQueryClient();
  const { data: user = null, isLoading: loadingCurrentUser } = useCurrentUser();

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    enabled: !EXPERTS_BETA_ENABLED,
  });

  const { data: savedTrailsData } = useQuery<SavedTrailsResponse>({
    queryKey: ['saved-trails', user?.id],
    enabled: Boolean(user),
    queryFn: ({ signal }) => fetchSavedTrails(signal),
  });

  const { data: guideTrailsData, isLoading: loadingGuideTrails } =
    useQuery<GuideTrailsResponse>({
      queryKey: GUIDE_TRAILS_QUERY_KEY,
      enabled: user?.role === 'expert',
      queryFn: ({ signal }) => fetchGuideTrails(signal),
    });

  const { data: participantRequestsData } = useQuery<ParticipantTrailRequestsResponse>({
    queryKey: [...PARTICIPANT_REQUESTS_QUERY_KEY, user?.id],
    enabled: user?.role === 'participant',
    queryFn: ({ signal }) => fetchParticipantTrailRequests(signal),
  });

  const {
    data: mapTrailDetail,
    isLoading: loadingMapTrail,
    error: mapTrailError,
    refetch: refetchMapTrail,
  } = useQuery({
    queryKey: QUERY_KEYS.trails.mapById(mapTrailId),
    queryFn: ({ signal }) => fetchTrailMapById(mapTrailId as string, signal),
    enabled: Boolean(mapTrailId) && mapOpen,
    retry: 1,
  });

  const trailsQuery = useInfiniteQuery({
    queryKey: QUERY_KEYS.trails.infiniteList({ ...filterQuery, pageSize }),
    queryFn: ({ signal, pageParam }) =>
      fetchTrailsPaginated(
        {
          ...filterQuery,
          offset: pageParam.offset,
          pageSize: pageParam.limit,
        },
        signal
      ),
    initialPageParam: { offset: 0, limit: pageSize } as TrailsPageParam,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam.offset + lastPage.trails.length;
      if (nextOffset >= lastPage.pagination.total) return undefined;
      return { offset: nextOffset, limit: pageSize } as TrailsPageParam;
    },
    staleTime: TRAILS_LIST_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const requestedByTrailId = useMemo(() => {
    const entries = (participantRequestsData?.requests || [])
      .filter((request) => request.trail_id && request.id)
      .map((request) => [request.trail_id, request.id] as const);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [participantRequestsData?.requests]);

  const trails = useMemo(
    () =>
      (trailsQuery.data?.pages.flatMap((page) => page.trails) || []).map((trail) => ({
        ...trail,
        isRequested: Boolean(requestedByTrailId[trail.id]),
      })),
    [requestedByTrailId, trailsQuery.data?.pages]
  );

  const savedTrailIds = useMemo(
    () => new Set((savedTrailsData?.trails || []).map((trail) => trail.id)),
    [savedTrailsData?.trails]
  );

  const associatedTrailIds = useMemo(
    () => new Set((guideTrailsData?.associated_trails || []).map((trail) => trail.id)),
    [guideTrailsData?.associated_trails]
  );

  const invalidateTrailsQueries = (trailId?: string) => {
    const infiniteKey = QUERY_KEYS.trails.infiniteList({ ...filterQuery, pageSize });
    const paginatedKey = QUERY_KEYS.trails.paginatedList({
      ...filterQuery,
      page: 1,
      pageSize,
    });
    const listKey = QUERY_KEYS.trails.list(filterQuery);

    if (trailId) {
      queryClient.setQueryData<InfiniteData<PaginatedTrailsResponse, TrailsPageParam>>(
        infiniteKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  trails: page.trails.filter((trail) => trail.id !== trailId),
                })),
              }
            : current
      );
    }

    void queryClient.invalidateQueries({ queryKey: infiniteKey });
    void queryClient.invalidateQueries({ queryKey: paginatedKey });
    void queryClient.invalidateQueries({ queryKey: listKey });
    if (trailId) {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trails.byId(trailId) });
    }
  };

  const requestMutation = useMutation({
    mutationFn: ({ trailId, ...payload }: TrailRequestMutationPayload) =>
      requestTrail(trailId, payload),
    onSuccess: async () => {
      const message = 'Request submitted successfully.';
      onRequestMessage(message);
      onToast('Request sent', 'Your trail request was submitted successfully.');
      await queryClient.invalidateQueries({
        queryKey: [...PARTICIPANT_REQUESTS_QUERY_KEY, user?.id],
      });
      onRequestSuccess();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to submit request.';
      onRequestMessage(message);
      onToast('Request failed', message);
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: cancelParticipantTrailRequest,
    onSuccess: (_data, requestId) => {
      queryClient.setQueryData<ParticipantTrailRequestsResponse>(
        [...PARTICIPANT_REQUESTS_QUERY_KEY, user?.id],
        (current) => ({
          requests: (current?.requests || []).filter((request) => request.id !== requestId),
        })
      );
      onToast('Request cancelled', 'Your trail request was cancelled.');
    },
    onError: (error) => {
      onToast('Cancel failed', error instanceof Error ? error.message : 'Failed to cancel request.');
    },
  });

  const savedTrailMutation = useMutation({
    mutationFn: ({ trailId, isSaved }: { trailId: string; isSaved: boolean }) =>
      setTrailSaved(trailId, isSaved),
    onSuccess: (data, payload) => {
      queryClient.setQueryData<SavedTrailsResponse>(['saved-trails', user?.id], (current) => {
        const currentTrails = current?.trails || [];
        return {
          trails: data.saved
            ? currentTrails.some((trail) => trail.id === payload.trailId)
              ? currentTrails
              : [{ id: payload.trailId }, ...currentTrails]
            : currentTrails.filter((trail) => trail.id !== payload.trailId),
        };
      });
      queryClient.setQueryData(['saved-trail', payload.trailId, user?.id], data);
      onToast(
        data.saved ? 'Trail saved' : 'Trail removed',
        data.saved
          ? 'You can find it in Saved Trails on your profile.'
          : 'The trail was removed from your saved list.'
      );
    },
    onError: (error) => {
      onToast('Save failed', error instanceof Error ? error.message : 'Failed to update saved trail.');
    },
  });

  const guideTrailMutation = useMutation({
    mutationFn: ({ trailId, isAssociated }: { trailId: string; isAssociated: boolean }) => {
      const currentIds = Array.from(associatedTrailIds);
      if (!isAssociated && currentIds.length >= 12) {
        throw new Error('You can associate up to 12 trails.');
      }
      const nextIds = isAssociated
        ? currentIds.filter((id) => id !== trailId)
        : [...currentIds, trailId];
      return updateGuideTrails(nextIds);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<GuideTrailsResponse>(GUIDE_TRAILS_QUERY_KEY, data);
      onToast('Guide trails updated', 'Your guide profile trail list has been updated.');
    },
    onError: (error) => {
      onToast('Update failed', error instanceof Error ? error.message : 'Failed to update associated trails.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrail,
    onSuccess: (_data, trailId) => {
      onToast('Trail deleted', 'The trail has been permanently deleted.');
      invalidateTrailsQueries(trailId);
    },
    onError: (error) => {
      onToast('Delete failed', error instanceof Error ? error.message : 'Failed to delete trail.');
    },
  });

  const hideMutation = useMutation({
    mutationFn: hideTrail,
    onSuccess: (_data, trailId) => {
      onToast('Trail hidden', 'The trail has been hidden from public view.');
      invalidateTrailsQueries(trailId);
    },
    onError: (error) => {
      onToast('Hide failed', error instanceof Error ? error.message : 'Failed to hide trail.');
    },
  });

  const unhideMutation = useMutation({
    mutationFn: unhideTrail,
    onSuccess: (_data, trailId) => {
      onToast('Trail visible', 'The trail is now visible to all users.');
      invalidateTrailsQueries(trailId);
    },
    onError: (error) => {
      onToast('Unhide failed', error instanceof Error ? error.message : 'Failed to unhide trail.');
    },
  });

  const pagination = trailsQuery.data?.pages.at(-1)?.pagination;

  return {
    user,
    loadingCurrentUser,
    experts,
    trails,
    pagination,
    requestedByTrailId,
    savedTrailIds,
    associatedTrailIds,
    guideTrailsData,
    loadingGuideTrails,
    mapTrail: mapTrailDetail || mapTrailSummary,
    mapTrailDetail,
    loadingMapTrail,
    mapTrailError,
    refetchMapTrail,
    isLoading: trailsQuery.isLoading,
    isFetching: trailsQuery.isFetching,
    isFetchingNextPage: trailsQuery.isFetchingNextPage,
    hasNextPage: trailsQuery.hasNextPage,
    fetchNextPage: trailsQuery.fetchNextPage,
    error: trailsQuery.error,
    requestMutation,
    cancelRequestMutation,
    savedTrailMutation,
    guideTrailMutation,
    deleteMutation,
    hideMutation,
    unhideMutation,
  };
}
