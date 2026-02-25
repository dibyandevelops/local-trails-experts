import { NextRequest } from 'next/server';
import { POST } from '@/app/api/events/[id]/join/route';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmailSafe: vi.fn(),
}));

describe('POST /api/events/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(null);
    vi.mocked(sendEmailSafe).mockResolvedValue({ sent: true } as never);
  });

  it('joins event and sends participant + organizer emails', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            max_participants: 10,
            current_participants: 2,
            title: 'Sunrise Ride',
            event_date: '2026-03-05T06:00:00.000Z',
            organizer_name: 'Guide One',
            organizer_email: 'guide@example.com',
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'ep-1',
            event_id: 'event-1',
            participant_email: 'rider@example.com',
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const request = new NextRequest('http://localhost/api/events/event-1/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        participant_name: 'Rider A',
        participant_email: 'rider@example.com',
        phone: '+9779800000000',
        expertise_level: 'beginner',
      }),
    });

    const response = await POST(request, { params: { id: 'event-1' } });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.participant.id).toBe('ep-1');
    expect(sendEmailSafe).toHaveBeenCalledTimes(2);
  });

  it('returns 400 when participant already joined', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            max_participants: 10,
            current_participants: 2,
            title: 'Sunrise Ride',
            event_date: '2026-03-05T06:00:00.000Z',
            organizer_name: 'Guide One',
            organizer_email: 'guide@example.com',
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'existing' }] } as never);

    const request = new NextRequest('http://localhost/api/events/event-1/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        participant_name: 'Rider A',
        participant_email: 'rider@example.com',
        expertise_level: 'beginner',
      }),
    });

    const response = await POST(request, { params: { id: 'event-1' } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/already joined/i);
    expect(sendEmailSafe).not.toHaveBeenCalled();
  });
});
