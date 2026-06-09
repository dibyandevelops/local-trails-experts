import { NextRequest } from 'next/server';
import { POST } from '@/app/api/events/[id]/join/route';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { sendPushToUserIds } from '@/lib/push';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmailSafe: vi.fn(),
}));

vi.mock('@/lib/push', () => ({
  sendPushToUserIds: vi.fn(),
}));

describe('POST /api/events/[id]/join', () => {
  function mockDbClient(...results: Array<{ rows: unknown[] }>) {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1])
        .mockResolvedValueOnce(results[2])
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(pool.connect).mockResolvedValue(client as never);
    return client;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(null);
    vi.mocked(sendEmailSafe).mockResolvedValue({ sent: true } as never);
    vi.mocked(sendPushToUserIds).mockResolvedValue({ sent: 0, failed: 0 } as never);
  });

  it('joins event and sends participant + organizer emails', async () => {
    mockDbClient(
      {
        rows: [
          {
            max_participants: 10,
            current_participants: 2,
            title: 'Sunrise Ride',
            event_date: '2026-12-05T06:00:00.000Z',
            organizer_email: 'guide@example.com',
            host_user_id: null,
          },
        ],
      },
      { rows: [] },
      {
        rows: [
          {
            id: 'ep-1',
            event_id: 'event-1',
            participant_email: 'rider@example.com',
          },
        ],
      }
    );
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          { id: 'user-participant', email: 'rider@example.com' },
          { id: 'user-organizer', email: 'guide@example.com' },
        ],
      } as never);

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

    const response = await POST(request, { params: Promise.resolve({ id: 'event-1' }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.participant.id).toBe('ep-1');
    expect(sendEmailSafe).toHaveBeenCalledTimes(2);
  });

  it('returns 400 when participant already joined', async () => {
    mockDbClient(
      {
        rows: [
          {
            max_participants: 10,
            current_participants: 2,
            title: 'Sunrise Ride',
            event_date: '2026-12-05T06:00:00.000Z',
            organizer_email: 'guide@example.com',
            host_user_id: null,
          },
        ],
      },
      { rows: [{ id: 'existing' }] }
    );

    const request = new NextRequest('http://localhost/api/events/event-1/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        participant_name: 'Rider A',
        participant_email: 'rider@example.com',
        expertise_level: 'beginner',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'event-1' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/already joined/i);
    expect(sendEmailSafe).not.toHaveBeenCalled();
  });

  it('does not send duplicate organizer email when organizer matches participant', async () => {
    mockDbClient(
      {
        rows: [
          {
            max_participants: 10,
            current_participants: 2,
            title: 'Sunrise Ride',
            event_date: '2026-12-05T06:00:00.000Z',
            organizer_email: 'rider@example.com',
            host_user_id: null,
          },
        ],
      },
      { rows: [] },
      {
        rows: [
          {
            id: 'ep-1',
            event_id: 'event-1',
            participant_email: 'rider@example.com',
          },
        ],
      }
    );
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'user-participant', email: 'rider@example.com' }],
      } as never);

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

    const response = await POST(request, { params: Promise.resolve({ id: 'event-1' }) });

    expect(response.status).toBe(201);
    expect(sendEmailSafe).toHaveBeenCalledTimes(1);
  });
});
