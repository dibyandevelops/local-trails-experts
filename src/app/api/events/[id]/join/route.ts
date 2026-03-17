import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { JoinEventInput } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { sendPushToUserIds } from '@/lib/push';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

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
      `SELECT
        max_participants,
        current_participants,
        title,
        event_date,
        organizer_name,
        organizer_email,
        host_user_id
      FROM events
      WHERE id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const {
      max_participants,
      current_participants,
      title,
      event_date,
      organizer_name,
      organizer_email,
      host_user_id,
    } = eventCheck.rows[0];

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
      new Set([organizer_email, hostEmail].filter(Boolean))
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
