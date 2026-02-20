import axios from 'axios';
import type { User } from '@/types';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';
import type { UserRole } from '@/types';

type LoginInput = {
  email: string;
  password: string;
  role: UserRole;
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
    return null;
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
