'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/services/auth/auth.service';
import type { User } from '@/types';
import { QUERY_KEYS } from '@/services/constants/query-keys';

type UseCurrentUserOptions = {
  enabled?: boolean;
};

export function useCurrentUser(
  initialData?: User | null,
  options?: UseCurrentUserOptions
) {
  return useQuery<User | null>({
    queryKey: QUERY_KEYS.auth.me,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
    initialData,
    placeholderData: (previousData) => previousData,
  });
}
