import { NextRequest } from 'next/server';
import { DELETE, GET, POST } from '@/app/api/trails/[id]/save/route';
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

const context = { params: Promise.resolve({ id: 'trail-1' }) };

describe('/api/trails/[id]/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports an unsaved trail to an anonymous visitor without exposing an auth error', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/trails/trail-1/save');

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: false });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('requires login before saving', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/trails/trail-1/save', {
      method: 'POST',
    });

    const response = await POST(request, context);

    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('saves an approved visible trail idempotently', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'user-1',
      role: 'participant',
      email: 'rider@example.com',
      iat: 1,
      exp: 9999999999,
    });
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ id: 'trail-1' }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);
    const request = new NextRequest('http://localhost/api/trails/trail-1/save', {
      method: 'POST',
    });

    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true });
    expect(String(vi.mocked(pool.query).mock.calls[1][0])).toContain('ON CONFLICT');
  });

  it('removes only the current user saved trail', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'user-1',
      role: 'participant',
      email: 'rider@example.com',
      iat: 1,
      exp: 9999999999,
    });
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as never);
    const request = new NextRequest('http://localhost/api/trails/trail-1/save', {
      method: 'DELETE',
    });

    const response = await DELETE(request, context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: false });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('user_id = $1'), [
      'user-1',
      'trail-1',
    ]);
  });
});
