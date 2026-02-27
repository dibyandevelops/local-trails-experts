import axios from 'axios';
import type {
  CreateEventInput,
  Event,
  ExpertiseLevel,
  JoinEventInput,
  SportType,
  User,
} from '@/types';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';

export async function fetchEventById(eventId: string, signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ event: Event }>(
      `${ApiPath.Events}/${eventId}`,
      { signal }
    );
    return data.event;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch event');
    }
    throw new Error('Failed to fetch event');
  }
}

export async function createEvent(payload: CreateEventInput) {
  try {
    const { data } = await apiClient.post<{ event: Event }>(ApiPath.Events, payload);
    return data.event;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to create event');
    }
    throw new Error('Failed to create event');
  }
}

export async function updateEvent(eventId: string, payload: CreateEventInput) {
  try {
    const { data } = await apiClient.patch<{ event: Event }>(
      `${ApiPath.Events}/${eventId}`,
      payload
    );
    return data.event;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to update event');
    }
    throw new Error('Failed to update event');
  }
}

export async function fetchVerifiedExperts(signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ experts: User[] }>(ApiPath.Experts, {
      params: { verified: true },
      signal,
    });
    return data.experts || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch experts');
    }
    throw new Error('Failed to fetch experts');
  }
}

type FetchEventsParams = {
  expertise?: ExpertiseLevel | '';
  city?: string;
  sport?: SportType | '';
  expert?: string;
  upcoming?: boolean;
};

export async function fetchEvents(params: FetchEventsParams, signal?: AbortSignal) {
  try {
    const { data } = await apiClient.get<{ events: Event[] }>(ApiPath.Events, {
      params: {
        expertise: params.expertise || undefined,
        city: params.city || undefined,
        sport: params.sport || undefined,
        expert: params.expert || undefined,
        upcoming: params.upcoming ? 'true' : undefined,
      },
      signal,
    });
    return data.events || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to fetch events');
    }
    throw new Error('Failed to fetch events');
  }
}

export async function joinEvent(eventId: string, payload: JoinEventInput) {
  try {
    const { data } = await apiClient.post<{ success?: boolean; error?: string }>(
      `${ApiPath.Events}/${eventId}/join`,
      payload
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to join event');
    }
    throw new Error('Failed to join event');
  }
}

export async function leaveEvent(eventId: string) {
  try {
    const { data } = await apiClient.post<{ success?: boolean; error?: string }>(
      `${ApiPath.Events}/${eventId}/leave`
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to leave event');
    }
    throw new Error('Failed to leave event');
  }
}

export async function cancelEvent(eventId: string) {
  try {
    const { data } = await apiClient.post<{ success?: boolean; error?: string }>(
      `${ApiPath.Events}/${eventId}/cancel`
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Failed to cancel event');
    }
    throw new Error('Failed to cancel event');
  }
}
