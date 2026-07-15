'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { fetchTrailsPaginated } from '@/services/trails/trails.service';
import { useDebouncedValue } from './use-debounced-value';

type UseTrailAutocompleteOptionsParams = {
  query: string;
  enabled?: boolean;
  pageSize?: number;
};

export function useTrailAutocompleteOptions({
  query,
  enabled = true,
  pageSize = 8,
}: UseTrailAutocompleteOptionsParams) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const search = debouncedQuery.length >= 2 ? debouncedQuery : '';

  return useQuery({
    queryKey: QUERY_KEYS.trails.paginatedList({
      search,
      page: 1,
      pageSize,
      sort: search ? '' : 'newest',
    }),
    queryFn: ({ signal }) =>
      fetchTrailsPaginated(
        {
          search,
          page: 1,
          pageSize,
          sort: search ? '' : 'newest',
        },
        signal
      ),
    enabled: enabled && search.length >= 2,
    staleTime: 60_000,
    select: (data) => data.trails,
  });
}
