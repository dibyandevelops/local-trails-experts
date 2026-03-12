import { NextRequest } from 'next/server';
import { GET } from '@/app/api/trails/route';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

describe('GET /api/trails (paginated list)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies expert visibility and pagination without SQL alias errors', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'expert-1',
      role: 'expert',
      email: 'expert@example.com',
      iat: 1,
      exp: 999999,
    } as any);

    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          { id: 'trail-1', name: 'Trail One', submitted_by_user_id: 'expert-1' },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [{ total: 1 }] } as never);

    const request = new NextRequest(
      'http://localhost/api/trails?sport=mtb&page=1&pageSize=12',
      { method: 'GET' }
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.trails)).toBe(true);
    expect(body.pagination.total).toBe(1);
    expect(vi.mocked(pool.query)).toHaveBeenCalledTimes(2);
  });

  it('excludes hidden trails for unauthenticated users', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(null as never);

    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ total: 0 }] } as never);

    const request = new NextRequest(
      'http://localhost/api/trails?sport=mtb&page=1&pageSize=12',
      { method: 'GET' }
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trails).toEqual([]);
    expect(body.pagination.total).toBe(0);

    const [listQuery, listParams] = vi.mocked(pool.query).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(listQuery).toMatch(/status = 'approved'/i);
    expect(listQuery).toMatch(/is_hidden = FALSE/i);
    expect(Array.isArray(listParams)).toBe(true);
  });
});
