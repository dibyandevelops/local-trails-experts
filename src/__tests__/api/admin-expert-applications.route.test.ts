import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/admin/expert-applications/route';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createTempPassword, getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';

vi.mock('@/lib/db', () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  createTempPassword: vi.fn(),
  getAuthFromRequest: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmailSafe: vi.fn(),
}));

describe('PATCH /api/admin/expert-applications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for non-admin user', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/admin/expert-applications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'app-1', status: 'approved' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it('approves application, creates expert user, and sends approval email', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'admin-1',
      role: 'admin',
      email: 'admin@example.com',
      iat: 1,
      exp: 999999,
    });

    vi.mocked(createTempPassword).mockReturnValue('temp-pass-123');
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-temp-pass' as never);
    vi.mocked(sendEmailSafe).mockResolvedValue({ sent: true } as never);

    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'app-1',
            name: 'Expert One',
            email: 'expert@example.com',
            city: 'Kathmandu',
            sports: ['mtb'],
            credentials: 'Certified MTB coach',
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            phone: '+9779800000000',
            phone_verified_at: null,
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const releaseMock = vi.fn();
    vi.mocked(pool.connect).mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    } as never);

    const request = new NextRequest('http://localhost/api/admin/expert-applications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'app-1', status: 'approved' }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tempPassword).toBe('temp-pass-123');
    expect(sendEmailSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'expert@example.com',
        subject: expect.stringMatching(/approved/i),
      })
    );
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
