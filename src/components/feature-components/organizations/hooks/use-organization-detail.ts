'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';

export type OrganizationDetail = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  member_count?: number;
  trail_count?: number;
};

export type OrganizationTrailRelation = {
  trail_id: string;
  trail_slug: string | null;
  trail_name: string;
  trail_location: string | null;
  relation_type: 'built_by' | 'verified_by' | 'maintained_by';
  is_primary: boolean;
};

export type OrganizationGalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export type OrganizationCampaign = {
  id: string;
  trail_id: string | null;
  title: string;
  description: string | null;
  target_amount_npr: string;
  raised_amount_npr: string;
  qr_image_url: string | null;
  payment_note: string | null;
  status: 'draft' | 'active' | 'looking_for_funds' | 'completed' | 'paused' | 'archived';
};

export type OrganizationMember = {
  id: string;
  role: 'org_admin' | 'org_editor';
  status: 'active' | 'invited' | 'disabled';
  created_at: string;
  user_id: string;
  user_name: string | null;
  user_city: string | null;
  user_role: 'admin' | 'expert' | 'participant';
};

export type OrganizationTrailUpdate = {
  id: string;
  trail_id: string;
  trail_slug: string | null;
  trail_name: string;
  update_type:
    | 'condition_update'
    | 'maintenance_done'
    | 'hazard_reported'
    | 'hazard_cleared'
    | 'route_changed'
    | 'metadata_updated';
  title: string;
  details: string | null;
  media_urls: string[] | null;
  created_at: string;
  actor_name: string | null;
};

export type OrganizationDetailPayload = {
  organization: OrganizationDetail;
  trails: OrganizationTrailRelation[];
  galleryItems: OrganizationGalleryItem[];
  campaigns: OrganizationCampaign[];
  members: OrganizationMember[];
  updates: OrganizationTrailUpdate[];
};

async function fetchOrganizationDetail(slug: string): Promise<OrganizationDetailPayload> {
  const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}?detail=true`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load trail builder');
  }
  return data;
}

export function useOrganizationDetail(slug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.organizations.detail(slug),
    queryFn: () => fetchOrganizationDetail(slug),
    enabled: Boolean(slug),
  });
}
