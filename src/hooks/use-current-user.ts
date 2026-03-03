'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/services/auth/auth.service';
import type { User } from '@/types';
import { QUERY_KEYS } from '@/services/constants/query-keys';

export function useCurrentUser(initialData?: User | null) {
  return useQuery<User | null>({
    queryKey: QUERY_KEYS.auth.me,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
    initialData,
    placeholderData: (previousData) => previousData,
  });
}
