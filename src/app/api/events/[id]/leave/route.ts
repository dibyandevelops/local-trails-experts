import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(_request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(
        'SELECT email FROM users WHERE id = $1 LIMIT 1',
        [auth.sub]
      );
      const email = userRes.rows[0]?.email;
      if (!email) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const deleteRes = await client.query(
        `
        DELETE FROM event_participants
        WHERE event_id = $1 AND participant_email = $2
        RETURNING id
      `,
        [eventId, email]
      );

      if (deleteRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You are not joined to this event' },
          { status: 400 }
        );
      }

      await client.query(
        `
        UPDATE events
        SET current_participants = GREATEST(current_participants - 1, 0)
        WHERE id = $1
      `,
        [eventId]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error leaving event:', error);
    return NextResponse.json(
      { error: 'Failed to leave event' },
      { status: 500 }
    );
  }
}
