import { NextRequest } from 'next/server';
import { POST } from '@/app/api/contact/group-request/route';
import { sendEmailSafe } from '@/lib/email';

vi.mock('@/lib/email', () => ({
  sendEmailSafe: vi.fn(),
}));

describe('POST /api/contact/group-request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendEmailSafe).mockResolvedValue({ sent: true } as never);
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'admin@example.com';
  });

  it('sends an email to admin with replyTo set to requester', async () => {
    const request = new NextRequest('http://localhost/api/contact/group-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Rider',
        email: 'rider@example.com',
        phone: '9800000000',
        groupSize: '24 riders + 1 support vehicle',
        preferredDate: '2026-03-30',
        trailId: 'trail-1',
        trailName: 'Forest Loop',
        trailLocation: 'Kathmandu',
        message: 'We want a safe large group ride with support vehicle.',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(sendEmailSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        replyTo: 'rider@example.com',
        subject: expect.stringContaining('Large group request'),
      })
    );
  });

  it('returns 400 for invalid payload', async () => {
    const request = new NextRequest('http://localhost/api/contact/group-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(sendEmailSafe).not.toHaveBeenCalled();
  });
});
