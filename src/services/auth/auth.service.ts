import axios from 'axios';
import type { User } from '@/types';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';

export async function fetchCurrentUser(
  signal?: AbortSignal
): Promise<User | null> {
  try {
    const { data } = await apiClient.get<{ user: User | null }>(ApiPath.Me, {
      signal,
    });
    return data.user || null;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }
    return null;
  }
}
