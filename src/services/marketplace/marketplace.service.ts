import axios from 'axios';
import { apiClient } from '@/services/api/client';
import type {
  MarketplaceListingInput,
  MarketplaceListingStatus,
  MarketplacePageData,
  MarketplaceReportReason,
  MarketplaceReportStatus,
  MarketplaceListing,
  MarketplaceReport,
} from '@/lib/marketplace';

function marketplaceError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    return new Error(message || fallback);
  }
  return error instanceof Error ? error : new Error(fallback);
}

async function request<T>(task: () => Promise<T>, fallback: string) {
  try {
    return await task();
  } catch (error) {
    throw marketplaceError(error, fallback);
  }
}

export async function fetchMarketplacePageData(signal?: AbortSignal) {
  return request(async () => {
    const { data } = await apiClient.get<MarketplacePageData>('/api/marketplace/listings', { signal });
    return data;
  }, 'Failed to load marketplace listings.');
}

export async function createMarketplaceListing(input: MarketplaceListingInput) {
  return request(async () => {
    const { data } = await apiClient.post<{ success: true; listingId: string }>('/api/marketplace/listings', input);
    return data;
  }, 'Failed to create marketplace listing.');
}

export async function updateMarketplaceListing(id: string, input: MarketplaceListingInput) {
  return request(async () => {
    const { data } = await apiClient.patch<{ success: true }>(`/api/marketplace/listings/${id}`, input);
    return data;
  }, 'Failed to update marketplace listing.');
}

export async function updateMarketplaceListingStatus(id: string, status: MarketplaceListingStatus) {
  return request(async () => {
    const { data } = await apiClient.patch<{ success: true }>(`/api/marketplace/listings/${id}`, { action: 'set_status', status });
    return data;
  }, 'Failed to update listing status.');
}

export async function deleteMarketplaceListing(id: string) {
  return request(async () => {
    const { data } = await apiClient.delete<{ success: true }>(`/api/marketplace/listings/${id}`);
    return data;
  }, 'Failed to delete marketplace listing.');
}

export async function reportMarketplaceListing(
  id: string,
  input: { reason: MarketplaceReportReason; details: string }
) {
  return request(async () => {
    const { data } = await apiClient.post<{ success: true }>(`/api/marketplace/listings/${id}/report`, input);
    return data;
  }, 'Failed to report marketplace listing.');
}

export type AdminMarketplaceData = {
  listings: MarketplaceListing[];
  reports: MarketplaceReport[];
};

export async function fetchAdminMarketplaceData(signal?: AbortSignal) {
  return request(async () => {
    const { data } = await apiClient.get<AdminMarketplaceData>('/api/admin/marketplace', { signal });
    return data;
  }, 'Failed to load marketplace moderation.');
}

export async function moderateMarketplaceListing(id: string, status: MarketplaceListingStatus) {
  return request(async () => {
    const { data } = await apiClient.patch<{ success: true }>('/api/admin/marketplace', { target: 'listing', id, status });
    return data;
  }, 'Failed to moderate listing.');
}

export async function reviewMarketplaceReport(id: string, status: MarketplaceReportStatus) {
  return request(async () => {
    const { data } = await apiClient.patch<{ success: true }>('/api/admin/marketplace', { target: 'report', id, status });
    return data;
  }, 'Failed to review report.');
}
