import axios from 'axios';
import type { User } from '@/types';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';
import type { UserRole } from '@/types';

type LoginInput = {
  email: string;
  password: string;
};

type LoginResponse = {
  user: {
    id: string;
    email?: string;
    role?: UserRole;
  };
};

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
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Only treat explicit unauthenticated responses as logged-out state.
      if (status === 401 || status === 403) {
        return null;
      }
      throw new Error(`Failed to fetch current user (status: ${status || 'network'})`);
    }
    throw new Error('Failed to fetch current user');
  }
}

export async function loginUser(
  payload: LoginInput
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>(ApiPath.Login, payload);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as { error?: string } | undefined;
      throw new Error(apiError?.error || 'Login failed. Please try again.');
    }
    throw new Error('Login failed. Please try again.');
  }
}
