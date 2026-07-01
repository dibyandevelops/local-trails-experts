import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization } from '@/lib/organization-access';
import { rateLimit } from '@/lib/rate-limit';
import { DELETE as deleteCampaign } from '@/app/api/admin/fundraising-campaigns/route';
import { DELETE as deleteTrailUpdate } from '@/app/api/admin/trail-updates/route';
import { DELETE as deleteTrailService } from '@/app/api/admin/trail-services/[id]/route';
import { DELETE as deleteTrailOrganization } from '@/app/api/admin/trail-organizations/[id]/route';
import { DELETE as deleteAdminOrganizationMember } from '@/app/api/admin/organization-members/[id]/route';
import { DELETE as deleteOrganization } from '@/app/api/organizations/[id]/route';
import { DELETE as deleteUser } from '@/app/api/admin/users/[id]/route';
import { DELETE as deleteOrganizationTrail } from '@/app/api/organizations/[id]/trails/route';
import { DELETE as deleteOrganizationMember } from '@/app/api/organizations/[id]/members/route';
import { PATCH as mutateTrail } from '@/app/api/trails/[id]/route';
import { POST as cancelEvent } from '@/app/api/events/[id]/cancel/route';
import { DELETE as deleteParticipantTrailRequest } from '@/app/api/participants/me/trail-requests/[requestId]/route';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

vi.mock('@/lib/organization-access', () => ({
  canAdministerOrganization: vi.fn(),
  canOperateOrganization: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

const adminAuth = {
  sub: 'admin-1',
  role: 'admin' as const,
  email: 'admin@example.com',
  iat: 1,
  exp: 9999999999,
};

const organizationAdminAuth = {
  sub: 'expert-1',
  role: 'expert' as const,
  email: 'expert@example.com',
  iat: 1,
  exp: 9999999999,
};

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function expectScopedDelete(callIndex: number, table: string, values: unknown[]) {
  const [sql, params] = vi.mocked(pool.query).mock.calls[callIndex];
  const normalizedSql = String(sql).replace(/\s+/g, ' ');
  expect(normalizedSql).toContain(`DELETE FROM ${table}`);
  expect(normalizedSql).toMatch(/ WHERE /i);
  expect(params).toEqual(values);
}

describe('destructive API scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthFromRequest).mockReturnValue(adminAuth);
    vi.mocked(canAdministerOrganization).mockResolvedValue(true);
    vi.mocked(rateLimit).mockResolvedValue(null);
  });

  it('deletes only the requested fundraising campaign', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ id: 'campaign-1', title: 'Campaign' }] } as never);

    const response = await deleteCampaign(
      jsonRequest('http://localhost/api/admin/fundraising-campaigns', 'DELETE', { id: 'campaign-1' })
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'fundraising_campaigns', ['campaign-1']);
  });

  it('deletes only the requested trail update', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ id: 'update-1', title: 'Update' }] } as never);

    const response = await deleteTrailUpdate(
      jsonRequest('http://localhost/api/admin/trail-updates', 'DELETE', { id: 'update-1' })
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'trail_update_logs', ['update-1']);
  });

  it('deletes only the trail service in the route parameter', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ id: 'service-1' }] } as never);

    const response = await deleteTrailService(
      jsonRequest('http://localhost/api/admin/trail-services/service-1', 'DELETE'),
      { params: Promise.resolve({ id: 'service-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'trail_services', ['service-1']);
  });

  it('deletes only the trail-organization assignment in the route parameter', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ id: 'assignment-1' }] } as never);

    const response = await deleteTrailOrganization(
      jsonRequest('http://localhost/api/admin/trail-organizations/assignment-1', 'DELETE'),
      { params: Promise.resolve({ id: 'assignment-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'trail_organizations', ['assignment-1']);
  });

  it('protects organization owners and scopes admin member deletion by member id', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ role: 'org_editor' }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'membership-1' }] } as never);

    const response = await deleteAdminOrganizationMember(
      jsonRequest('http://localhost/api/admin/organization-members/membership-1', 'DELETE'),
      { params: Promise.resolve({ id: 'membership-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(1, 'organization_members', ['membership-1']);
  });

  it('deletes only the exact organization identifier despite cascade relationships', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ id: 'org-1', name: 'Organization' }] } as never);

    const response = await deleteOrganization(
      jsonRequest('http://localhost/api/organizations/org-slug', 'DELETE'),
      { params: Promise.resolve({ id: 'org-slug' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'organizations o', ['org-slug']);
    expect(String(vi.mocked(pool.query).mock.calls[0][0])).toContain('o.slug = $1');
  });

  it('prevents self/admin deletion and scopes ordinary user deletion by user id', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', role: 'participant', email: 'rider@example.com' }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const response = await deleteUser(
      jsonRequest('http://localhost/api/admin/users/user-1', 'DELETE'),
      { params: Promise.resolve({ id: 'user-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(1, 'users', ['user-1']);
  });

  it('scopes an organization trail removal by relation and organization ids', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(organizationAdminAuth);
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ id: 'relation-1' }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const response = await deleteOrganizationTrail(
      jsonRequest('http://localhost/api/organizations/org-1/trails', 'DELETE', { relation_id: 'relation-1' }),
      { params: Promise.resolve({ id: 'org-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'trail_organizations', ['relation-1', 'org-1']);
    expect(String(vi.mocked(pool.query).mock.calls[0][0])).toContain(
      'id = $1 AND organization_id = $2'
    );
  });

  it('scopes organization member removal by member and organization ids', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(organizationAdminAuth);
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ user_id: 'expert-2', role: 'org_editor', status: 'active' }],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const response = await deleteOrganizationMember(
      jsonRequest('http://localhost/api/organizations/org-1/members', 'DELETE', { member_id: 'membership-1' }),
      { params: Promise.resolve({ id: 'org-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(1, 'organization_members', ['membership-1', 'org-1']);
    expect(String(vi.mocked(pool.query).mock.calls[1][0])).toContain(
      'id = $1 AND organization_id = $2'
    );
  });

  it('deletes only the exact trail selected by an admin', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ id: 'trail-1', submitted_by_user_id: 'expert-1' }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'trail-1' }] } as never);

    const response = await mutateTrail(
      jsonRequest('http://localhost/api/trails/trail-1', 'PATCH', { action: 'delete' }),
      { params: Promise.resolve({ id: 'trail-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(1, 'trails', ['trail-1']);
  });

  it('cancels only the requested event and its own participant records', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'event-1', host_user_id: 'expert-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(pool.connect).mockResolvedValue(client as never);
    vi.mocked(getAuthFromRequest).mockReturnValue(organizationAdminAuth);

    const response = await cancelEvent(
      jsonRequest('http://localhost/api/events/event-1/cancel', 'POST'),
      { params: Promise.resolve({ id: 'event-1' }) }
    );

    expect(response.status).toBe(200);
    expect(String(client.query.mock.calls[2][0])).toContain(
      'DELETE FROM event_participants WHERE event_id = $1'
    );
    expect(client.query.mock.calls[2][1]).toEqual(['event-1']);
    expect(String(client.query.mock.calls[3][0])).toContain('DELETE FROM events WHERE id = $1');
    expect(client.query.mock.calls[3][1]).toEqual(['event-1']);
  });

  it('lets a participant delete only their own trail request', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1',
      role: 'participant',
      email: 'rider@example.com',
      iat: 1,
      exp: 9999999999,
    });
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ id: 'request-1' }] } as never);

    const response = await deleteParticipantTrailRequest(
      jsonRequest('http://localhost/api/participants/me/trail-requests/request-1', 'DELETE'),
      { params: Promise.resolve({ requestId: 'request-1' }) }
    );

    expect(response.status).toBe(200);
    expectScopedDelete(0, 'trail_interest_requests', ['request-1', 'participant-1']);
    expect(String(vi.mocked(pool.query).mock.calls[0][0])).toContain(
      'id = $1 AND requester_user_id = $2'
    );
  });
});
