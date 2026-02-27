import axios from 'axios';
import type { Event } from '@/types';
import { apiClient } from '@/services/api/client';

export async function fetchMyParticipantEvents(signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ events: Event[] }>(
      '/api/participants/me/events',
      { signal }
    );
    return data.events || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch participant events');
    }
    throw new Error('Failed to fetch participant events');
  }
}
