import { NextRequest } from 'next/server';
import { POST } from '@/app/api/login/route';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';
import { setAuthCookie, signAuthToken } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  setAuthCookie: vi.fn(),
  signAuthToken: vi.fn(),
}));

describe('POST /api/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(null);
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/missing required fields/i);
    expect(vi.mocked(pool.query)).not.toHaveBeenCalled();
  });

  it('logs in valid user and sets auth cookie', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            bio: null,
            city: null,
            sports: null,
            is_verified_expert: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            password_hash: 'hashed-password',
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(signAuthToken).mockReturnValue('signed.jwt.token');

    const request = new NextRequest('http://localhost/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'pass1234',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.email).toBe('admin@example.com');
    expect(signAuthToken).toHaveBeenCalled();
    expect(setAuthCookie).toHaveBeenCalledWith(response, 'signed.jwt.token');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
