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
      distanceMin?: string;
      distanceMax?: string;
      sort?: string;
      hazardous?: boolean;
    }) =>
      [
        'trails',
        filters?.search || '',
        filters?.difficulty || '',
        filters?.location || '',
        filters?.sport || '',
        filters?.distanceMin || '',
        filters?.distanceMax || '',
        filters?.sort || '',
        filters?.hazardous ? 'true' : 'false',
      ] as const,
    forEvents: ['trails-for-events'] as const,
    paginatedList: (filters?: {
      search?: string;
      difficulty?: string;
      location?: string;
      sport?: string;
      distanceMin?: string;
      distanceMax?: string;
      sort?: string;
      hazardous?: boolean;
      page?: number;
      pageSize?: number;
    }) =>
      [
        'trails-paginated',
        filters?.search || '',
        filters?.difficulty || '',
        filters?.location || '',
        filters?.sport || '',
        filters?.distanceMin || '',
        filters?.distanceMax || '',
        filters?.sort || '',
        filters?.hazardous ? 'true' : 'false',
        String(filters?.page || 1),
        String(filters?.pageSize || 12),
      ] as const,
    infiniteList: (filters?: {
      search?: string;
      difficulty?: string;
      location?: string;
      sport?: string;
      distanceMin?: string;
      distanceMax?: string;
      sort?: string;
      hazardous?: boolean;
      pageSize?: number;
    }) =>
      [
        'trails-infinite',
        filters?.search || '',
        filters?.difficulty || '',
        filters?.location || '',
        filters?.sport || '',
        filters?.distanceMin || '',
        filters?.distanceMax || '',
        filters?.sort || '',
        filters?.hazardous ? 'true' : 'false',
        String(filters?.pageSize || 12),
      ] as const,
    byId: (id?: string | null) => ['trail', id || ''] as const,
    mapById: (id?: string | null) => ['trail-map', id || ''] as const,
    reviews: (id?: string | null) => ['trail-reviews', id || ''] as const,
  },
  experts: {
    verified: ['experts', 'verified'] as const,
    list: (filters?: { city?: string; sport?: string; id?: string; verified?: boolean }) =>
      [
        'experts',
        filters?.city || '',
        filters?.sport || '',
        filters?.id || '',
        filters?.verified ? 'true' : 'false',
      ] as const,
    events: (expertId?: string) => ['experts-events', expertId || ''] as const,
    strava: (expertId?: string) => ['experts-strava', expertId || ''] as const,
    reviews: (expertId?: string) => ['expert-reviews', expertId || ''] as const,
  },
  stores: {
    all: () => ['stores'] as const,
    list: (params: Record<string, unknown>) => ['stores', params] as const,
  },
  events: {
    byId: (id?: string | null) => ['event', id || ''] as const,
    list: (filters?: {
      expertise?: string;
      city?: string;
      sport?: string;
      expert?: string;
      upcoming?: boolean;
      community?: boolean;
    }) =>
      [
        'events',
        filters?.expertise || '',
        filters?.city || '',
        filters?.sport || '',
        filters?.expert || '',
        filters?.upcoming ? 'true' : 'false',
        filters?.community ? 'true' : 'false',
      ] as const,
    joinedByParticipant: ['participant-joined-events'] as const,
  },
  admin: {
    expertApplications: (status?: string) =>
      ['admin', 'expert-applications', status || 'all'] as const,
    pendingTrails: ['admin', 'pending-trails'] as const,
    trailRequests: ['admin', 'trail-requests'] as const,
    users: (role?: string) => ['admin', 'users', role || 'all'] as const,
  },
} as const;
