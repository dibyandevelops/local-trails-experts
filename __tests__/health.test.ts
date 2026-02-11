import { GET } from '@/app/api/health/route';

describe('health endpoint', () => {
  it('returns ok', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
