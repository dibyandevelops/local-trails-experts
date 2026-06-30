import { NextRequest } from 'next/server';
import { POST } from '@/app/api/organizations/apply/route';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/image-url', () => ({
  isAllowedImageUrl: vi.fn(() => true),
}));

function request(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/organizations/apply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Kathmandu Trail Collective',
      slug: 'kathmandu-trail-collective',
      description: 'Maintaining and documenting local trails.',
      ...body,
    }),
  });
}

describe('POST /api/organizations/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(null as never);
  });

  it('rejects unauthenticated users', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(null);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects experts who have not been verified by an admin', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'expert-1',
      role: 'expert',
      email: 'expert@example.com',
      iat: 1,
      exp: 999999,
    });
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as never);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/approved by an admin/i);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('creates one public organization owned by the verified expert', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'expert-1',
      role: 'expert',
      email: 'expert@example.com',
      iat: 1,
      exp: 999999,
    });
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{ id: 'expert-1', email: 'expert@example.com' }],
    } as never);
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'kathmandu-trail-collective', name: 'Kathmandu Trail Collective' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const release = vi.fn();
    vi.mocked(pool.connect).mockResolvedValue({ query, release } as never);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.organization.id).toBe('org-1');
    expect(String(query.mock.calls[2][0])).toContain('TRUE, TRUE');
    expect(query.mock.calls[2][1]).toContain('expert-1');
    expect(String(query.mock.calls[3][0])).toContain("'org_owner'");
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rejects a verified expert who already owns an organization', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'expert-1',
      role: 'expert',
      email: 'expert@example.com',
      iat: 1,
      exp: 999999,
    });
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{ id: 'expert-1', email: 'expert@example.com' }],
    } as never);
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'org-existing' }] })
      .mockResolvedValueOnce({ rows: [] });
    vi.mocked(pool.connect).mockResolvedValue({ query, release: vi.fn() } as never);

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });
});
