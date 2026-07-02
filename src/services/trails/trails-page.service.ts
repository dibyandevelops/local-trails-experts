import axios from 'axios';
import type { Trail } from '@/types';
import { apiClient } from '@/services/api/client';

export type SavedTrailsResponse = {
  trails: Array<Pick<Trail, 'id'>>;
};

export type GuideTrailsResponse = {
  associated_trails: Trail[];
};

export type ParticipantTrailRequest = {
  id: string;
  trail_id: string;
};

export type ParticipantTrailRequestsResponse = {
  requests: ParticipantTrailRequest[];
};

function serviceError(error: unknown, fallback: string): never {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string } | undefined;
    throw new Error(payload?.error || fallback);
  }
  throw new Error(fallback);
}

export async function fetchSavedTrails(signal?: AbortSignal): Promise<SavedTrailsResponse> {
  try {
    const { data } = await apiClient.get<SavedTrailsResponse>('/api/me/saved-trails', { signal });
    return { trails: data.trails || [] };
  } catch (error) {
    serviceError(error, 'Failed to load saved trails');
  }
}

export async function setTrailSaved(trailId: string, isSaved: boolean) {
  try {
    const { data } = await apiClient.request<{ saved: boolean }>({
      url: `/api/trails/${trailId}/save`,
      method: isSaved ? 'DELETE' : 'POST',
    });
    return data;
  } catch (error) {
    serviceError(error, 'Failed to update saved trail');
  }
}

export async function fetchGuideTrails(signal?: AbortSignal): Promise<GuideTrailsResponse> {
  try {
    const { data } = await apiClient.get<GuideTrailsResponse>('/api/experts/me/trails', { signal });
    return { associated_trails: data.associated_trails || [] };
  } catch (error) {
    serviceError(error, 'Failed to load associated trails');
  }
}

export async function updateGuideTrails(trailIds: string[]): Promise<GuideTrailsResponse> {
  try {
    const { data } = await apiClient.patch<GuideTrailsResponse>('/api/experts/me/trails', {
      trail_ids: trailIds,
    });
    return { associated_trails: data.associated_trails || [] };
  } catch (error) {
    serviceError(error, 'Failed to update associated trails');
  }
}

export async function fetchParticipantTrailRequests(
  signal?: AbortSignal
): Promise<ParticipantTrailRequestsResponse> {
  try {
    const { data } = await apiClient.get<ParticipantTrailRequestsResponse>(
      '/api/participants/me/trail-requests',
      { signal }
    );
    return { requests: data.requests || [] };
  } catch (error) {
    serviceError(error, 'Failed to load trail requests');
  }
}

export async function cancelParticipantTrailRequest(requestId: string) {
  try {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/api/participants/me/trail-requests/${requestId}`
    );
    return data;
  } catch (error) {
    serviceError(error, 'Failed to cancel request');
  }
}
