'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpertRideProgram, ExpertRideProgramType, ExpertiseLevel } from '@/types';

export type OrganizationProgramExpert = {
  id: string;
  name: string | null;
  email: string;
  profile_photo_url: string | null;
  trail_ids: string[];
};

export type CreateOrganizationProgramPayload = {
  title: string;
  expert_user_id: string;
  trail_id: string;
  program_type: ExpertRideProgramType;
  description: string;
  price_npr: number | null;
  max_group_size: number;
  duration_note: string;
  meeting_point_note: string;
  availability_weekdays: string[];
  available_time_note: string;
  skill_level: ExpertiseLevel;
};

type OrganizationProgramsResponse = {
  programs: ExpertRideProgram[];
  experts?: OrganizationProgramExpert[];
};

async function requestPrograms(
  organizationId: string,
  init?: RequestInit
): Promise<OrganizationProgramsResponse> {
  const response = await fetch(`/api/organizations/${organizationId}/ride-programs`, {
    cache: 'no-store',
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Program request failed.');
  return data;
}

export function useOrganizationRidePrograms(organizationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['organization-ride-programs', organizationId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => requestPrograms(organizationId),
    enabled: Boolean(organizationId),
  });

  const createProgram = useMutation({
    mutationFn: (payload: CreateOrganizationProgramPayload) =>
      requestPrograms(organizationId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, (current?: OrganizationProgramsResponse) => ({
        experts: current?.experts || [],
        programs: data.programs,
      }));
    },
  });

  const toggleProgram = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      requestPrograms(organizationId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, (current?: OrganizationProgramsResponse) => ({
        experts: current?.experts || [],
        programs: data.programs,
      }));
    },
  });

  return {
    programs: query.data?.programs || [],
    experts: query.data?.experts || [],
    isLoading: query.isLoading,
    error: query.error,
    createProgram,
    toggleProgram,
  };
}
