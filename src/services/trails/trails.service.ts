import axios from 'axios';
import type { Difficulty, Trail } from '@/types';
import { ApiPath } from '@/services/api/paths';
import { apiClient } from '@/services/api/client';

export type TrailFilters = {
  search?: string;
  difficulty?: Difficulty | '';
  location?: string;
  sport?: string;
  distanceMin?: string;
  distanceMax?: string;
  sort?: string;
  hazardous?: boolean;
  page?: number;
  pageSize?: number;
};

export type TrailsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedTrailsResponse = {
  trails: Trail[];
  pagination: TrailsPagination;
};

export async function fetchTrails(
  filters: TrailFilters = {},
  signal?: AbortSignal
): Promise<Trail[]> {
  try {
    const params: Record<string, string> = {};
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.location?.trim()) params.location = filters.location.trim();
    if (filters.sport?.trim()) params.sport = filters.sport.trim();
    if (filters.distanceMin?.trim()) params.distanceMin = filters.distanceMin.trim();
    if (filters.distanceMax?.trim()) params.distanceMax = filters.distanceMax.trim();
    if (filters.sort?.trim()) params.sort = filters.sort.trim();
    if (filters.hazardous) params.hazardous = 'true';

    const { data } = await apiClient.get<{ trails: Trail[] }>(ApiPath.Trails, {
      params,
      signal,
    });
    return data.trails || [];
  } catch (error) {
    console.log({ error });
    if (axios.isCancel(error)) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch trails');
    }
    throw new Error('Failed to fetch trails');
  }
}

export async function fetchTrailsPaginated(
  filters: TrailFilters = {},
  signal?: AbortSignal
): Promise<PaginatedTrailsResponse> {
  try {
    const params: Record<string, string | number> = {};
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.location?.trim()) params.location = filters.location.trim();
    if (filters.sport?.trim()) params.sport = filters.sport.trim();
    if (filters.distanceMin?.trim()) params.distanceMin = filters.distanceMin.trim();
    if (filters.distanceMax?.trim()) params.distanceMax = filters.distanceMax.trim();
    if (filters.sort?.trim()) params.sort = filters.sort.trim();
    if (filters.hazardous) params.hazardous = 'true';
    params.page = filters.page || 1;
    params.pageSize = filters.pageSize || 12;

    const { data } = await apiClient.get<PaginatedTrailsResponse>(ApiPath.Trails, {
      params,
      signal,
    });

    return {
      trails: data.trails || [],
      pagination: data.pagination || {
        page: Number(params.page),
        pageSize: Number(params.pageSize),
        total: data.trails?.length || 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch trails');
    }
    throw new Error('Failed to fetch trails');
  }
}

export async function fetchTrailById(trailId: string, signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ trail: Trail }>(
      `${ApiPath.Trails}/${trailId}`,
      { signal }
    );
    return data.trail;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch trail');
    }
    throw new Error('Failed to fetch trail');
  }
}

export async function uploadTrailRoute(trailId: string, file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<{ trail: Trail }>(
      `${ApiPath.Trails}/${trailId}/upload-route`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.trail;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to upload route');
    }
    throw new Error('Failed to upload route');
  }
}

export async function removeTrailRoute(trailId: string) {
  try {
    const { data } = await apiClient.patch<{ trail: Trail }>(
      `${ApiPath.Trails}/${trailId}`,
      { action: 'remove_route' }
    );
    return data.trail;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to remove route');
    }
    throw new Error('Failed to remove route');
  }
}

export async function updateTrail(trailId: string, payload: Partial<Trail>) {
  try {
    const { data } = await apiClient.patch<{ trail: Trail }>(
      `${ApiPath.Trails}/${trailId}`,
      payload
    );
    return data.trail;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to update trail');
    }
    throw new Error('Failed to update trail');
  }
}

export async function deleteTrail(trailId: string) {
  try {
    const { data } = await apiClient.patch<{ success: boolean }>(
      `${ApiPath.Trails}/${trailId}`,
      { action: 'delete' }
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to delete trail');
    }
    throw new Error('Failed to delete trail');
  }
}

export async function hideTrail(trailId: string) {
  try {
    const { data } = await apiClient.patch<{ success: boolean; trail: Trail }>(
      `${ApiPath.Trails}/${trailId}`,
      { action: 'hide' }
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to hide trail');
    }
    throw new Error('Failed to hide trail');
  }
}

export async function unhideTrail(trailId: string) {
  try {
    const { data } = await apiClient.patch<{ success: boolean; trail: Trail }>(
      `${ApiPath.Trails}/${trailId}`,
      { action: 'unhide' }
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to unhide trail');
    }
    throw new Error('Failed to unhide trail');
  }
}

export async function requestTrail(
  trailId: string,
  payload: { description: string; expert_user_id?: string; preferred_date: string }
) {
  try {
    const { data } = await apiClient.post<{ success: boolean; error?: string }>(
      `${ApiPath.Trails}/${trailId}/request`,
      payload
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to request trail');
    }
    throw new Error('Failed to request trail');
  }
}
