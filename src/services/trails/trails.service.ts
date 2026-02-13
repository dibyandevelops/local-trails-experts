import axios from 'axios';
import type { Difficulty, Trail } from '@/types';
import { ApiPath } from '@/services/api/paths';
import { apiClient } from '@/services/api/client';

export type TrailFilters = {
  search?: string;
  difficulty?: Difficulty | '';
  location?: string;
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
