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
    byId: (id?: string | null) => ['trail', id || ''] as const,
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
  },
  events: {
    byId: (id?: string | null) => ['event', id || ''] as const,
    list: (filters?: {
      expertise?: string;
      city?: string;
      sport?: string;
      expert?: string;
      upcoming?: boolean;
    }) =>
      [
        'events',
        filters?.expertise || '',
        filters?.city || '',
        filters?.sport || '',
        filters?.expert || '',
        filters?.upcoming ? 'true' : 'false',
      ] as const,
    joinedByParticipant: ['participant-joined-events'] as const,
  },
} as const;
