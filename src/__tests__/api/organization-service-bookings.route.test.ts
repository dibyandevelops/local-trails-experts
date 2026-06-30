import { NextRequest } from 'next/server';
import { POST } from '@/app/api/organization-services/[serviceId]/bookings/route';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

const context = { params: Promise.resolve({ serviceId: 'service-1' }) };

function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

describe('POST /api/organization-services/[serviceId]/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires a participant account', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue(null);
    const request = new NextRequest('http://localhost/api/organization-services/service-1/bookings', {
      method: 'POST',
      body: JSON.stringify({ preferred_date: futureDate() }),
    });

    const response = await POST(request, context);

    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects invalid booking details before querying the service', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1', role: 'participant', email: 'rider@example.com', iat: 1, exp: 9999999999,
    });
    const request = new NextRequest('http://localhost/api/organization-services/service-1/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ preferred_date: '2020-01-01', group_size: 0 }),
    });

    const response = await POST(request, context);

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('creates a pending request with account identity and current service price', async () => {
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'participant-1', role: 'participant', email: 'rider@example.com', iat: 1, exp: 9999999999,
    });
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'service-1', organization_id: 'org-1', price_npr: '2500', title: 'Guided ride', organization_name: 'Trail Org' }],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ name: 'Rider', email: 'rider@example.com', phone: '+9779800000000' }],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'booking-1', status: 'pending', created_at: new Date().toISOString() }],
      } as never);
    const request = new NextRequest('http://localhost/api/organization-services/service-1/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ preferred_date: futureDate(), preferred_time: '09:30', group_size: 3 }),
    });

    const response = await POST(request, context);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.booking).toMatchObject({ id: 'booking-1', status: 'pending' });
    expect(vi.mocked(pool.query).mock.calls[2][1]).toEqual(expect.arrayContaining([
      'service-1', 'org-1', 'participant-1', 'Rider', 'rider@example.com', '2500',
    ]));
  });
});
