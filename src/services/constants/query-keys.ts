export const QUERY_KEYS = {
  auth: {
    me: ['me'] as const,
  },
  trails: {
    list: (filters?: {
      search?: string;
      difficulty?: string;
      location?: string;
      sport?: string;
    }) =>
      [
        'trails',
        filters?.search || '',
        filters?.difficulty || '',
        filters?.location || '',
        filters?.sport || '',
      ] as const,
    forEvents: ['trails-for-events'] as const,
  },
  experts: {
    verified: ['experts', 'verified'] as const,
  },
  events: {
    byId: (id?: string | null) => ['event', id || ''] as const,
  },
} as const;
