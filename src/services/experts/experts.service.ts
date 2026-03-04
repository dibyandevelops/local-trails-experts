import axios from 'axios';
import type { Event, SportType, User } from '@/types';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';

type ExpertWithEvents = User & { events: Event[] };

type FetchExpertsParams = {
  city?: string;
  sport?: SportType | '';
  id?: string;
  verified?: boolean;
};

export async function fetchExperts(params: FetchExpertsParams = {}, signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ experts: ExpertWithEvents[] }>(
      ApiPath.Experts,
      {
        params: {
          city: params.city || undefined,
          sport: params.sport || undefined,
          id: params.id || undefined,
          verified: params.verified ? 'true' : undefined,
        },
        signal,
      }
    );
    return data.experts || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch experts');
    }
    throw new Error('Failed to fetch experts');
  }
}

export async function fetchExpertEvents(expertId: string, signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ events: Event[] }>(
      `${ApiPath.Experts}/${expertId}/events`,
      { signal }
    );
    return data.events || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch expert events');
    }
    throw new Error('Failed to fetch expert events');
  }
}

export type ExpertStravaSummary = {
  connected: boolean;
  profile: {
    id?: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    profile?: string | null;
  } | null;
  stats: {
    recent_ride_totals?: { count?: number; distance?: number; moving_time?: number };
    all_ride_totals?: { count?: number; distance?: number; moving_time?: number };
    ytd_ride_totals?: { count?: number; distance?: number; moving_time?: number };
  } | null;
  syncedAt: string | null;
};

export async function fetchExpertStravaSummary(
  expertId: string,
  signal?: AbortSignal
): Promise<ExpertStravaSummary> {
  try {
    const { data } = await apiClient.get<ExpertStravaSummary>(
      `${ApiPath.Experts}/${expertId}/strava`,
      { signal }
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch Strava summary');
    }
    throw new Error('Failed to fetch Strava summary');
  }
}
