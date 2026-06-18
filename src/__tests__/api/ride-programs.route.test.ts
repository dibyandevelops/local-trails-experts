import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendPushToUserIds } from '@/lib/push';
import { POST as requestRideProgram } from '@/app/api/expert-ride-programs/[id]/request/route';
import { PATCH as updateParticipantRideRequest } from '@/app/api/participants/me/ride-program-requests/[requestId]/route';
import { PATCH as updateExpertRideRequest } from '@/app/api/experts/me/ride-program-requests/route';
import { GET as getAdminRidePrograms } from '@/app/api/admin/ride-programs/route';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

vi.mock('@/lib/push', () => ({
  sendPushToUserIds: vi.fn(),
}));

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Ride with Experts API rules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sendPushToUserIds).mockResolvedValue({ sent: 0, failed: 0 });
  });

  it('uses program availability before expert availability when requesting a ride', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1',
      role: 'participant',
      email: 'rider@example.com',
    } as never);
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'program-1',
            expert_user_id: 'expert-1',
            trail_id: 'trail-1',
            title: 'Ride with Expert to Trail',
            max_group_size: 4,
            program_availability_weekdays: ['Saturday'],
            availability_weekdays: ['Sunday'],
            expert_name: 'Expert',
            trail_name: 'Trail',
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'participant-1', name: 'Rider', email: 'rider@example.com', phone: null }],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const request = jsonRequest('http://localhost/api/expert-ride-programs/program-1/request', {
      preferred_date: '2099-06-21', // Sunday
      group_size: 1,
    });

    const response = await requestRideProgram(request, {
      params: Promise.resolve({ id: 'program-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('not marked available on Sunday');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('updates an existing active request instead of creating a duplicate', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1',
      role: 'participant',
      email: 'rider@example.com',
    } as never);
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'program-1',
            expert_user_id: 'expert-1',
            trail_id: 'trail-1',
            title: 'Ride with Expert to Trail',
            max_group_size: 4,
            program_availability_weekdays: [],
            availability_weekdays: ['Sunday'],
            expert_name: 'Expert',
            trail_name: 'Trail',
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'participant-1', name: 'Rider', email: 'rider@example.com', phone: null }],
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'request-1' }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const request = jsonRequest('http://localhost/api/expert-ride-programs/program-1/request', {
      preferred_date: '2099-06-21',
      preferred_time: '07:00',
      group_size: 2,
    });

    const response = await requestRideProgram(request, {
      params: Promise.resolve({ id: 'program-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.updated).toBe(true);
    expect(vi.mocked(pool.query).mock.calls[3][0]).toContain('UPDATE expert_ride_program_requests');
    expect(sendPushToUserIds).toHaveBeenCalledWith(
      ['expert-1'],
      expect.objectContaining({ title: 'Ride program request updated' })
    );
  });

  it('rejects participant edits for completed requests', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1',
      role: 'participant',
      email: 'rider@example.com',
    } as never);
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [
        {
          id: 'request-1',
          program_id: 'program-1',
          status: 'completed',
          max_group_size: 4,
          program_availability_weekdays: [],
          expert_name: 'Expert',
          availability_weekdays: ['Sunday'],
        },
      ],
    } as never);

    const request = new NextRequest('http://localhost/api/participants/me/ride-program-requests/request-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ preferred_date: '2099-06-21', group_size: 1 }),
    });

    const response = await updateParticipantRideRequest(request, {
      params: Promise.resolve({ requestId: 'request-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Only pending or accepted requests can be edited');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('saves expert response note and notifies participant on status update', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'expert-1',
      role: 'expert',
      email: 'expert@example.com',
    } as never);
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'request-1',
            requester_user_id: 'participant-1',
            requester_name: 'Rider',
            status: 'accepted',
            expert_response_note: 'Meet at 6:30 AM near the gate.',
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [{ title: 'Ride with Expert to Trail' }] } as never);

    const request = new NextRequest('http://localhost/api/experts/me/ride-program-requests', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'request-1',
        status: 'accepted',
        expert_response_note: 'Meet at 6:30 AM near the gate.',
      }),
    });

    const response = await updateExpertRideRequest(request);

    expect(response.status).toBe(200);
    expect(vi.mocked(pool.query).mock.calls[0][1]).toEqual([
      'request-1',
      'expert-1',
      'accepted',
      'Meet at 6:30 AM near the gate.',
    ]);
    expect(sendPushToUserIds).toHaveBeenCalledWith(
      ['participant-1'],
      expect.objectContaining({
        body: expect.stringContaining('Meet at 6:30 AM near the gate.'),
      })
    );
  });

  it('requires admin auth for admin ride program visibility', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1',
      role: 'participant',
      email: 'rider@example.com',
    } as never);

    const request = new NextRequest('http://localhost/api/admin/ride-programs');
    const response = await getAdminRidePrograms(request);

    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
