'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/services/auth/auth.service';
import type { User } from '@/types';

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['me'],
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    staleTime: 5 * 60 * 1000,
  });
}
