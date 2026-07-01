import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/organizations/[id]/gallery/[itemId]/route';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getAuthFromRequest: vi.fn(),
}));

const context = {
  params: Promise.resolve({
    id: '11111111-1111-4111-8111-111111111111',
    itemId: '22222222-2222-4222-8222-222222222222',
  }),
};

describe('DELETE /api/organizations/[id]/gallery/[itemId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthFromRequest).mockReturnValue({
      sub: 'admin-1',
      role: 'admin',
      email: 'admin@example.com',
      iat: 1,
      exp: 9999999999,
    });
  });

  it('deletes only the requested item within its organization', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ id: '11111111-1111-4111-8111-111111111111' }],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            organization_id: '11111111-1111-4111-8111-111111111111',
            image_url: 'https://example.com/gallery-one.jpg',
            caption: 'Gallery one',
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
      } as never);
    const request = new NextRequest(
      'http://localhost/api/organizations/11111111-1111-4111-8111-111111111111/gallery/22222222-2222-4222-8222-222222222222',
      { method: 'DELETE' }
    );

    const response = await DELETE(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedItem.id).toBe('22222222-2222-4222-8222-222222222222');
    expect(String(vi.mocked(pool.query).mock.calls[1][0])).toContain(
      'WHERE id = $1 AND organization_id = $2'
    );
    expect(vi.mocked(pool.query).mock.calls[1][1]).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    ]);
  });
});
