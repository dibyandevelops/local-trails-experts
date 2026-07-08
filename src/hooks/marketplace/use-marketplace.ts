'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MarketplaceListingInput,
  MarketplaceListingStatus,
  MarketplacePageData,
  MarketplaceReportReason,
} from '@/lib/marketplace';
import {
  createMarketplaceListing,
  deleteMarketplaceListing,
  fetchMarketplacePageData,
  reportMarketplaceListing,
  updateMarketplaceListing,
  updateMarketplaceListingStatus,
} from '@/services/marketplace/marketplace.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';

export function useMarketplace(initialData: MarketplacePageData) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEYS.marketplace.page,
    queryFn: ({ signal }) => fetchMarketplacePageData(signal),
    initialData,
    staleTime: 30_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.marketplace.page });

  const createMutation = useMutation({
    mutationFn: createMarketplaceListing,
    onSuccess: refresh,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarketplaceListingInput }) =>
      updateMarketplaceListing(id, input),
    onSuccess: refresh,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MarketplaceListingStatus }) =>
      updateMarketplaceListingStatus(id, status),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMarketplaceListing,
    onSuccess: refresh,
  });
  const reportMutation = useMutation({
    mutationFn: ({ id, reason, details }: { id: string; reason: MarketplaceReportReason; details: string }) =>
      reportMarketplaceListing(id, { reason, details }),
  });

  return { query, createMutation, updateMutation, statusMutation, deleteMutation, reportMutation };
}
