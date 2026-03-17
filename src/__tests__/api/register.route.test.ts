import { NextRequest } from 'next/server';
import { POST } from '@/app/api/register/route';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { setAuthCookie, signAuthToken } from '@/lib/auth';

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

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmailSafe: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  setAuthCookie: vi.fn(),
  signAuthToken: vi.fn(),
}));

describe('POST /api/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(null as any);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-pass' as never);
    vi.mocked(signAuthToken).mockReturnValue('test-token');
    vi.mocked(sendEmailSafe).mockResolvedValue({ sent: true } as never);
  });

  it('registers participant and sends welcome email', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never) // email check
      .mockResolvedValueOnce({ rows: [] } as never) // phone check
      .mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'dibyan@example.com', role: 'participant' }],
      } as never); // insert

    const request = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Dibyan',
        email: 'dibyan@example.com',
        password: 'Password1',
        phone: '+9779800000000',
        sports: ['mtb'],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user.email).toBe('dibyan@example.com');
    expect(setAuthCookie).toHaveBeenCalledTimes(1);
    expect(sendEmailSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dibyan@example.com',
        subject: 'Welcome to LocoXperts',
        replyTo: 'dibyan@example.com',
      })
    );
    const emailPayload = vi.mocked(sendEmailSafe).mock.calls[0][0];
    expect(emailPayload.html).toContain('Join events');
    expect(emailPayload.text).toContain('Search trails');
    expect(emailPayload.from).toContain('via LocoXperts');
  });
});
