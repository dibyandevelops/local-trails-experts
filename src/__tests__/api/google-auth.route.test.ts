import { NextRequest } from 'next/server';
import { GET as startGoogle } from '@/app/api/auth/google/start/route';
import { GET as googleCallback } from '@/app/api/auth/google/callback/route';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createTempPassword, setAuthCookie, signAuthToken } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  createTempPassword: vi.fn(),
  signAuthToken: vi.fn(),
  setAuthCookie: vi.fn(),
}));

describe('Google participant auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  });

  it('GET /api/auth/google/start redirects to Google and sets state cookie', async () => {
    const request = new NextRequest('http://localhost/api/auth/google/start?next=%2Ftrails');
    const response = await startGoogle(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location') || '';
    expect(location).toMatch(/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
    expect(location).toMatch(/scope=openid\+email\+profile/);
    expect(response.cookies.get('mtb_google_oauth_state')?.value).toBeTruthy();
    expect(response.cookies.get('mtb_google_oauth_next')?.value).toBe('/trails');
  });

  it('GET /api/auth/google/callback creates participant if missing and sets auth cookie', async () => {
    vi.mocked(createTempPassword).mockReturnValue('temp-pass' as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
    vi.mocked(signAuthToken).mockReturnValue('signed.jwt.token' as never);

    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never) // SELECT by email
      .mockResolvedValueOnce({ rows: [{ id: 'p-1' }] } as never) // INSERT user
      .mockResolvedValueOnce({ rows: [] } as never); // UPDATE last_login

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'at-1' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'p@example.com', name: 'Pat' }), { status: 200 })
      );

    const request = new NextRequest(
      'http://localhost/api/auth/google/callback?code=code-1&state=state-1',
      {
        headers: {
          cookie: 'mtb_google_oauth_state=state-1; mtb_google_oauth_next=%2Ftrails',
        },
      }
    );

    const response = await googleCallback(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/trails');
    expect(setAuthCookie).toHaveBeenCalledWith(response, 'signed.jwt.token');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

