import axios from 'axios';
import type { Event, ExpertRideProgram, ExpertiseLevel, SportType, User } from '@/types';
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

export async function fetchExpertRidePrograms(signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ programs: ExpertRideProgram[] }>(
      '/api/expert-ride-programs',
      { signal }
    );
    return data.programs || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch ride programs');
    }
    throw new Error('Failed to fetch ride programs');
  }
}

export async function fetchMyExpertRidePrograms(signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ programs: ExpertRideProgram[] }>(
      '/api/experts/me/ride-programs',
      { signal }
    );
    return data.programs || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch your ride programs');
    }
    throw new Error('Failed to fetch your ride programs');
  }
}

export type SaveExpertRideProgramPayload = {
  trail_id: string;
  description?: string;
  price_npr?: number | null;
  max_group_size?: number;
  duration_note?: string;
  meeting_point_note?: string;
  skill_level?: ExpertiseLevel;
  is_active?: boolean;
};

export async function saveMyExpertRideProgram(payload: SaveExpertRideProgramPayload) {
  try {
    const { data } = await apiClient.post<{ programs: ExpertRideProgram[] }>(
      '/api/experts/me/ride-programs',
      payload
    );
    return data.programs || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to save ride program');
    }
    throw new Error('Failed to save ride program');
  }
}

export async function updateMyExpertRideProgram(programId: string, payload: { is_active?: boolean }) {
  try {
    const { data } = await apiClient.patch<{ programs: ExpertRideProgram[] }>(
      '/api/experts/me/ride-programs',
      { id: programId, ...payload }
    );
    return data.programs || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to update ride program');
    }
    throw new Error('Failed to update ride program');
  }
}

export type RequestExpertRideProgramPayload = {
  preferred_date: string;
  preferred_time?: string;
  group_size?: number;
  requester_phone?: string;
  offered_price_npr?: number | null;
  notes?: string;
};

export async function requestExpertRideProgram(
  programId: string,
  payload: RequestExpertRideProgramPayload
) {
  try {
    const { data } = await apiClient.post<{ success: boolean }>(
      `/api/expert-ride-programs/${programId}/request`,
      payload
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to submit ride request');
    }
    throw new Error('Failed to submit ride request');
  }
}
