import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { JoinEventInput } from '@/types';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const limited = await rateLimit(request, 'event-join', 10, 60);
    if (limited) return limited;

    const eventId = params.id;
    const body: JoinEventInput = await request.json();

    const { participant_name, participant_email, phone, expertise_level } = body;

    if (!participant_name || !participant_email || !expertise_level) {
      return NextResponse.json(
        { error: 'Missing required fields: participant_name, participant_email, expertise_level' },
        { status: 400 }
      );
    }

    // Check if event exists and has space
    const eventCheck = await pool.query(
      'SELECT max_participants, current_participants FROM events WHERE id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const { max_participants, current_participants } = eventCheck.rows[0];

    if (current_participants >= max_participants) {
      return NextResponse.json(
        { error: 'Event is full' },
        { status: 400 }
      );
    }

    // Check if participant already joined
    const existingParticipant = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = $1 AND participant_email = $2',
      [eventId, participant_email]
    );

    if (existingParticipant.rows.length > 0) {
      return NextResponse.json(
        { error: 'You have already joined this event' },
        { status: 400 }
      );
    }

    // Add participant
    const insertQuery = `
      INSERT INTO event_participants (event_id, participant_name, participant_email, phone, expertise_level)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const participantResult = await pool.query(insertQuery, [
      eventId,
      participant_name,
      participant_email,
      phone || null,
      expertise_level,
    ]);

    // Update event participant count
    await pool.query(
      'UPDATE events SET current_participants = current_participants + 1 WHERE id = $1',
      [eventId]
    );

    return NextResponse.json(
      { participant: participantResult.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error joining event:', error);
    return NextResponse.json(
      { error: 'Failed to join event' },
      { status: 500 }
    );
  }
}
