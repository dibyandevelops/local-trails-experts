import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(_request, 'event-cancel', 5, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(_request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const eventRes = await client.query(
        'SELECT id, host_user_id FROM events WHERE id = $1 FOR UPDATE',
        [eventId]
      );
      const event = eventRes.rows[0];
      if (!event) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const canCancel = auth.role === 'admin' || event.host_user_id === auth.sub;
      if (!canCancel) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await client.query('DELETE FROM event_participants WHERE event_id = $1', [
        eventId,
      ]);
      await client.query('DELETE FROM events WHERE id = $1', [eventId]);
      await client.query('COMMIT');
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cancelling event:', error);
    return NextResponse.json(
      { error: 'Failed to cancel event' },
      { status: 500 }
    );
  }
}
