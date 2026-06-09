import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { JoinEventInput } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { sendPushToUserIds } from '@/lib/push';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request, 'event-join', 10, 60);
    if (limited) return limited;

    const { id: eventId } = await params;
    const body: JoinEventInput = await request.json();

    const participant_name = String(body.participant_name || '').trim();
    const participant_email = String(body.participant_email || '').trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : '';
    const expertise_level = String(body.expertise_level || '').trim();

    if (!participant_name || !participant_email || !expertise_level) {
      return NextResponse.json(
        { error: 'Missing required fields: participant_name, participant_email, expertise_level' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant_email)) {
      return NextResponse.json(
        { error: 'Invalid participant email.' },
        { status: 400 }
      );
    }

    if (participant_name.length > 120 || participant_email.length > 254 || phone.length > 40) {
      return NextResponse.json(
        { error: 'Participant details are too long.' },
        { status: 400 }
      );
    }

    let title = '';
    let event_date: string | Date = '';
    let organizer_email: string | null = null;
    let host_user_id: string | null = null;
    let participantRow: unknown = null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const eventCheck = await client.query(
        `SELECT
          max_participants,
          current_participants,
          title,
          event_date,
          organizer_email,
          host_user_id
        FROM events
        WHERE id = $1
        FOR UPDATE`,
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      const event = eventCheck.rows[0];
      title = event.title;
      event_date = event.event_date;
      organizer_email = event.organizer_email;
      host_user_id = event.host_user_id;

      const eventTimestamp = new Date(event_date).getTime();
      if (Number.isFinite(eventTimestamp) && eventTimestamp < Date.now()) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'This event has already ended.' },
          { status: 400 }
        );
      }

      const maxParticipants = Number(event.max_participants || 0);
      const currentParticipants = Number(event.current_participants || 0);
      if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Event is full' },
          { status: 400 }
        );
      }

      const existingParticipant = await client.query(
        'SELECT id FROM event_participants WHERE event_id = $1 AND lower(participant_email) = lower($2) LIMIT 1',
        [eventId, participant_email]
      );

      if (existingParticipant.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You have already joined this event' },
          { status: 400 }
        );
      }

      const participantResult = await client.query(
        `
        INSERT INTO event_participants (event_id, participant_name, participant_email, phone, expertise_level)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          eventId,
          participant_name,
          participant_email,
          phone || null,
          expertise_level,
        ]
      );
      participantRow = participantResult.rows[0];

      await client.query(
        'UPDATE events SET current_participants = current_participants + 1 WHERE id = $1',
        [eventId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const eventDateLabel = new Date(event_date).toLocaleString();
    const participantEmail = buildBrandedEmail({
      subject: `Joined: ${title}`,
      appUrl: getAppUrl(),
      headline: `You're in for ${title}`,
      subhead: `Scheduled for ${eventDateLabel}.`,
      greetingName: participant_name,
      bodyHtml: `You have successfully joined <strong>${title}</strong> scheduled for ${eventDateLabel}.`,
      bodyText: `You have successfully joined "${title}" scheduled for ${eventDateLabel}.`,
    });
    await sendEmailSafe({
      to: participant_email,
      ...participantEmail,
      dedupeKey: `event-join:participant:${eventId}:${participant_email}`,
    });

    let hostEmail: string | null = null;
    if (host_user_id) {
      const hostRes = await pool.query(
        'SELECT email FROM users WHERE id = $1 LIMIT 1',
        [host_user_id]
      );
      hostEmail = hostRes.rows[0]?.email || null;
    }
    const organizerTargets = Array.from(
      new Set(
        [organizer_email, hostEmail].filter(
          (email): email is string => typeof email === 'string' && email.length > 0
        )
      )
    ).filter((email) => email !== participant_email);

    if (organizerTargets.length > 0) {
      const organizerEmailPayload = buildBrandedEmail({
        subject: `New participant joined: ${title}`,
        appUrl: getAppUrl(),
        headline: 'New participant joined',
        subhead: `${participant_name} joined ${title}.`,
        bodyHtml: `${participant_name} (${participant_email}) joined your event <strong>${title}</strong>.`,
        bodyText: `${participant_name} (${participant_email}) joined your event "${title}".`,
      });
      await Promise.all(
        organizerTargets.map((to) =>
          sendEmailSafe({
            to,
            ...organizerEmailPayload,
            dedupeKey: `event-join:organizer:${eventId}:${to}:${participant_email}`,
          })
        )
      );
    }

    const usersResult = await pool.query(
      `
        SELECT id, email
        FROM users
        WHERE email = ANY($1::text[])
      `,
      [[participant_email, organizer_email, hostEmail].filter(Boolean)]
    );

    const participantUserIds = usersResult.rows
      .filter((row) => row.email === participant_email)
      .map((row) => row.id as string);
    const organizerUserIds = Array.from(
      new Set(
        usersResult.rows
          .filter((row) => row.email === organizer_email || row.email === hostEmail)
          .map((row) => row.id as string)
      )
    );

    await Promise.allSettled([
      sendPushToUserIds(participantUserIds, {
        title: 'You joined an event',
        body: `Your spot for "${title}" is confirmed.`,
        url: `/events/${eventId}`,
      }),
      sendPushToUserIds(organizerUserIds, {
        title: 'New participant joined',
        body: `${participant_name} joined "${title}".`,
        url: `/events/${eventId}`,
      }),
    ]);

    return NextResponse.json(
      { participant: participantRow },
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
