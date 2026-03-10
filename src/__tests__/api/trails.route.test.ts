import { NextRequest } from 'next/server';
import { POST } from '@/app/api/trails/route';
import pool from '@/lib/db';
import { parseGPX } from '@/lib/gpx-parser';
import { sendEmailSafe } from '@/lib/email';
import { getAuthFromRequest } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/gpx-parser', () => ({
  parseGPX: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmailSafe: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

function makeMultipartRequest(formData: { get: (key: string) => any }) {
  // NextRequest's multipart parsing can be flaky in unit tests; we only need
  // headers + formData() for this route handler.
  return {
    headers: new Headers({ 'content-type': 'multipart/form-data; boundary=unit-test' }),
    formData: async () => formData,
  } as unknown as NextRequest;
}

function makeFakeFormData(fields: Record<string, any>) {
  return {
    get: (key: string) => (key in fields ? fields[key] : null),
  };
}

describe('POST /api/trails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parseGPX).mockResolvedValue({
      coordinates: [{ latitude: 27.7, longitude: 85.3, elevation: 1300 }],
      totalDistance: 12.3,
      elevationGain: 420,
      elevationLoss: 420,
      minElevation: 1200,
      maxElevation: 1600,
    } as any);
    vi.mocked(sendEmailSafe).mockResolvedValue({ sent: true } as never);
    vi.mocked(getAuthFromRequest).mockReturnValue(null);
  });

  it('returns 400 when request is not multipart/form-data', async () => {
    const request = new NextRequest('http://localhost/api/trails', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/multipart\/form-data/i);
    expect(vi.mocked(pool.query)).not.toHaveBeenCalled();
  });

  it('returns 400 when GPX file is missing', async () => {
    const formData = makeFakeFormData({
      name: 'Trail One',
      difficulty: 'easy',
      location: 'Anywhere',
      sport_type: 'mtb',
    });

    const request = makeMultipartRequest(formData);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/gpx file is required/i);
  });

  it('creates pending trail for unauthenticated user (public)', async () => {
    const formData = makeFakeFormData({
      name: 'Trail One',
      description: 'Test',
      difficulty: 'easy',
      location: 'Anywhere',
      sport_type: 'mtb',
      safety_labels: JSON.stringify(['helmet', 'water']),
      gpx_file: {
        name: 'route.gpx',
        text: async () => '<gpx></gpx>',
      },
    });

    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ id: 'trail-1', name: 'Trail One' }] } as never)
      .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] } as never);

    const request = makeMultipartRequest(formData);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.trail.id).toBe('trail-1');
    expect(body.requiresApproval).toBe(true);
    expect(sendEmailSafe).toHaveBeenCalledTimes(1);
  });

  it('creates approved trail for admin without sending approval email', async () => {
    const formData = makeFakeFormData({
      name: 'Trail Two',
      difficulty: 'medium',
      location: 'Somewhere',
      sport_type: 'mtb',
      gpx_file: {
        name: 'route.gpx',
        text: async () => '<gpx></gpx>',
      },
    });

    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'admin-1',
      role: 'admin',
      email: 'admin@example.com',
      iat: 1,
      exp: 999999,
    } as any);

    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ name: 'Admin', email: 'admin@example.com' }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'trail-2', name: 'Trail Two' }] } as never);

    const request = makeMultipartRequest(formData);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.trail.id).toBe('trail-2');
    expect(body.requiresApproval).toBe(false);
    expect(sendEmailSafe).not.toHaveBeenCalled();
  });
});
