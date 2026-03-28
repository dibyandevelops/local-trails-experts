import { NextRequest } from 'next/server';
import { GET as startGoogle } from '@/app/api/auth/google/start/route';
import { GET as googleCallback } from '@/app/api/auth/google/callback/route';
import pool from '@/lib/db';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { getAuthFromRequest } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
  signAuthToken: vi.fn(),
  setAuthCookie: vi.fn(),
}));

describe('Google auth routes', () => {
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

  it('GET /api/auth/google/callback logs in when the account is connected to Google', async () => {
    vi.mocked(signAuthToken).mockReturnValue('signed.jwt.token' as never);

    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'p-1', role: 'participant', email: 'p@example.com', google_sub: 'sub-1' }],
      } as never) // SELECT user by email
      .mockResolvedValueOnce({ rows: [] } as never); // UPDATE last_login

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'at-1' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'p@example.com', name: 'Pat', sub: 'sub-1' }), {
          status: 200,
        })
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

  it('connect mode links google_sub to the current user and redirects to profile', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'p-1',
      role: 'participant',
      email: 'p@example.com',
      iat: 0,
      exp: 9999999999,
    } as never);

    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'p-1', email: 'p@example.com', role: 'participant', google_sub: null }],
      } as never) // SELECT me
      .mockResolvedValueOnce({ rows: [] } as never) // SELECT existingSub
      .mockResolvedValueOnce({ rows: [] } as never); // UPDATE users

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'at-1' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'p@example.com', name: 'Pat', sub: 'sub-2' }), {
          status: 200,
        })
      );

    const request = new NextRequest(
      'http://localhost/api/auth/google/callback?code=code-1&state=state-1',
      {
        headers: {
          cookie:
            'mtb_google_oauth_state=state-1; mtb_google_oauth_next=%2Ftrails; mtb_google_oauth_mode=connect',
        },
      }
    );

    const response = await googleCallback(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/participants/me?message=google_connected');
    expect(setAuthCookie).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
