import axios from 'axios';
import { apiClient } from '@/services/api/client';

export type ExpertApplicationStatus = 'pending' | 'approved' | 'rejected';

export type ExpertApplication = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  sports: string[] | null;
  credentials: string;
  verification_years_experience?: string | null;
  verification_certifications?: string | null;
  verification_guiding_history?: string | null;
  verification_safety_training?: string | null;
  verification_achievements?: string | null;
  verification_strava_url?: string | null;
  verification_links?: string | null;
  status: ExpertApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
};

export type PendingTrail = {
  id: string;
  name: string;
  description?: string | null;
  sport_type: string;
  difficulty: string;
  location: string;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
  estimated_time_hours?: number | null;
  image_url?: string | null;
  trail_images?: string[] | null;
  safety_labels?: string[] | null;
  route_data?: unknown | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  created_at: string;
  updated_at?: string;
};

export type TrailInterestRequest = {
  id: string;
  trail_id: string;
  trail_name: string;
  trail_location: string | null;
  trail_sport_type: string | null;
  requester_name: string | null;
  requester_email: string;
  preferred_date: string | null;
  assigned_expert_user_id: string | null;
  assigned_expert_name: string | null;
  assigned_expert_email: string | null;
  preferred_time: string | null;
  offered_price_npr: number | null;
  nearest_point: string | null;
  needs_paid_shuttle: boolean;
  description: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: 'expert' | 'participant' | 'admin';
  city: string | null;
  sports: string[] | null;
  is_hidden?: boolean | null;
  phone: string | null;
  verification_years_experience?: string | null;
  verification_certifications?: string | null;
  verification_guiding_history?: string | null;
  verification_safety_training?: string | null;
  verification_achievements?: string | null;
  verification_strava_url?: string | null;
  verification_links?: string | null;
  created_at: string;
};

export type OrganizationOption = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  whatsapp_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  country?: string | null;
  is_verified: boolean;
  is_active: boolean;
  member_count?: number;
  trail_count?: number;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'org_admin' | 'org_editor';
  status: 'active' | 'invited' | 'disabled';
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string;
  user_role: 'admin' | 'expert' | 'participant';
  organization_name: string;
  organization_slug: string;
};

export type TrailOrganizationRelationType =
  | 'built_by'
  | 'verified_by'
  | 'maintained_by';

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as { error?: string } | undefined;
    return apiError?.error || fallback;
  }
  return fallback;
}

export async function fetchAdminExpertApplications(status: string) {
  try {
    const { data } = await apiClient.get<{ applications: ExpertApplication[] }>(
      '/api/admin/expert-applications',
      {
        params: status === 'all' ? undefined : { status },
      }
    );
    return data.applications || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load applications'));
  }
}

export async function updateAdminExpertApplicationStatus(
  id: string,
  status: ExpertApplicationStatus
) {
  try {
    const { data } = await apiClient.patch<{
      application?: { email?: string };
      tempPassword?: string | null;
    }>('/api/admin/expert-applications', { id, status });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update application'));
  }
}

export async function sendAdminVerificationRequest(
  applicationId: string,
  message: string
) {
  try {
    const { data } = await apiClient.post<{ success?: boolean }>(
      '/api/admin/expert-applications/request-verification',
      { applicationId, message }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to send email'));
  }
}

export async function fetchAdminPendingTrails() {
  try {
    const { data } = await apiClient.get<{ trails: PendingTrail[] }>(
      '/api/admin/trails',
      {
        params: { status: 'pending' },
      }
    );
    return data.trails || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch pending trails'));
  }
}

export async function moderateAdminTrail(
  id: string,
  status: 'approved' | 'rejected'
) {
  try {
    const { data } = await apiClient.patch<{ trail?: PendingTrail }>(
      '/api/admin/trails',
      { id, status }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update trail'));
  }
}

export async function fetchAdminTrailRequests() {
  try {
    const { data } = await apiClient.get<{ requests: TrailInterestRequest[] }>(
      '/api/admin/trail-requests'
    );
    return data.requests || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch trail requests'));
  }
}

export async function fetchAdminUsers(role: 'expert' | 'participant') {
  try {
    const { data } = await apiClient.get<{ users: AdminUser[] }>(
      '/api/admin/users',
      { params: { role } }
    );
    return data.users || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch users'));
  }
}

export async function deleteAdminUser(userId: string) {
  try {
    const { data } = await apiClient.delete<{ success?: boolean }>(
      `/api/admin/users/${userId}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete user'));
  }
}

export async function updateAdminExpertVisibility(userId: string, isHidden: boolean) {
  try {
    const { data } = await apiClient.patch<{ user: Pick<AdminUser, 'id' | 'is_hidden'> }>(
      '/api/admin/users',
      { id: userId, is_hidden: isHidden }
    );
    return data.user;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update expert visibility'));
  }
}

export async function fetchAdminOrganizations() {
  try {
    const { data } = await apiClient.get<{ organizations: OrganizationOption[] }>(
      '/api/organizations'
    );
    return data.organizations || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch organizations'));
  }
}

export async function createAdminOrganization(input: {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  city?: string;
  country?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  logo_url?: string;
  is_verified?: boolean;
  is_active?: boolean;
}) {
  try {
    const { data } = await apiClient.post<{ organization: OrganizationOption }>(
      '/api/organizations',
      input
    );
    return data.organization;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create organization'));
  }
}

export async function updateAdminOrganization(
  idOrSlug: string,
  input: Partial<{
    slug: string;
    name: string;
    tagline: string;
    description: string;
    city: string;
    country: string;
    website_url: string;
    contact_email: string;
    contact_phone: string;
    whatsapp_url: string;
    instagram_url: string;
    facebook_url: string;
    logo_url: string;
    is_verified: boolean;
    is_active: boolean;
  }>
) {
  try {
    const { data } = await apiClient.patch<{ organization: OrganizationOption }>(
      `/api/organizations/${idOrSlug}`,
      input
    );
    return data.organization;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update organization'));
  }
}

export async function deleteAdminOrganization(idOrSlug: string) {
  try {
    const { data } = await apiClient.delete<{ organization: Pick<OrganizationOption, 'id' | 'name'> }>(
      `/api/organizations/${idOrSlug}`
    );
    return data.organization;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete organization'));
  }
}

export async function assignTrailOrganization(input: {
  trail_id: string;
  organization_id: string;
  relation_type: TrailOrganizationRelationType;
  is_primary?: boolean;
}) {
  try {
    const { data } = await apiClient.post<{ assignment?: unknown }>(
      '/api/admin/trail-organizations',
      input
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to assign organization'));
  }
}

export async function fetchAdminOrganizationMembers(organizationId: string) {
  try {
    const { data } = await apiClient.get<{ members: OrganizationMember[] }>(
      '/api/admin/organization-members',
      { params: { organization_id: organizationId } }
    );
    return data.members || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to fetch organization members'));
  }
}

export async function upsertAdminOrganizationMember(input: {
  organization_id: string;
  user_id: string;
  role: 'org_admin' | 'org_editor';
  status?: 'active' | 'invited' | 'disabled';
}) {
  try {
    const { data } = await apiClient.post<{ member: OrganizationMember }>(
      '/api/admin/organization-members',
      input
    );
    return data.member;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to save organization member'));
  }
}

export async function updateAdminOrganizationMember(
  memberId: string,
  input: {
    role?: 'org_admin' | 'org_editor';
    status?: 'active' | 'invited' | 'disabled';
  }
) {
  try {
    const { data } = await apiClient.patch<{ member: OrganizationMember }>(
      `/api/admin/organization-members/${memberId}`,
      input
    );
    return data.member;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update organization member'));
  }
}

export async function deleteAdminOrganizationMember(memberId: string) {
  try {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/api/admin/organization-members/${memberId}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete organization member'));
  }
}
