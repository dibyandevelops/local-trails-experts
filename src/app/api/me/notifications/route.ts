import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  tone: NotificationTone;
};

function toIsoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim()) return new Date(value).toISOString();
  return new Date().toISOString();
}

function sortAndLimit(items: NotificationItem[], limit = 8) {
  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications: NotificationItem[] = [];

    const userResult = await pool.query(
      `
      SELECT id, name, role, bio, city, sports, phone, is_verified_expert
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [auth.sub]
    );
    const user = userResult.rows[0];

    if (user) {
      const sports = Array.isArray(user.sports) ? user.sports : [];
      const profileIncomplete = !user.name || !user.city || sports.length === 0 || !user.phone;
      if (profileIncomplete && auth.role !== 'admin') {
        notifications.push({
          id: `profile-${auth.sub}`,
          type: 'profile',
          title: 'Complete your profile',
          description: 'Add your name, city, sport interests, and phone so requests work better.',
          href: auth.role === 'expert' ? '/experts/me' : '/participants/me',
          createdAt: new Date().toISOString(),
          tone: 'warning',
        });
      }

      if (auth.role === 'expert' && !user.is_verified_expert) {
        notifications.push({
          id: `expert-verification-${auth.sub}`,
          type: 'expert_verification',
          title: 'Expert verification pending',
          description: 'Complete or update verification details before promoting ride programs.',
          href: '/experts/me',
          createdAt: new Date().toISOString(),
          tone: 'warning',
        });
      }
    }

    if (auth.role === 'admin') {
      const [
        expertApps,
        storeRequests,
        trailRequests,
        pendingTrails,
        rideRequests,
        paymentProofs,
        rideNotes,
        recentEvents,
        upcomingEvents,
        eventParticipants,
        eventBookings,
      ] = await Promise.all([
          pool.query(
            `
            SELECT id, name, email, created_at
            FROM expert_applications
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT id, store_name, city, created_at
            FROM store_requests
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT tir.id, tir.requester_name, tir.requester_email, t.name AS trail_name, tir.created_at
            FROM trail_interest_requests tir
            JOIN trails t ON t.id = tir.trail_id
            ORDER BY tir.created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT id, name, created_at
            FROM trails
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT r.id, r.requester_name, r.requester_email, p.title AS program_title, r.created_at
            FROM expert_ride_program_requests r
            JOIN expert_ride_programs p ON p.id = r.program_id
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT p.id, p.created_at, p.proof_submitted_at, e.title AS event_title
            FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            JOIN events e ON e.id = b.event_id
            WHERE p.status = 'pending'
              AND p.proof_image_url IS NOT NULL
            ORDER BY COALESCE(p.proof_submitted_at, p.created_at) DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT
              rn.id,
              rn.title,
              rn.updated_at,
              rn.created_at,
              u.name AS expert_name,
              u.email AS expert_email,
              o.name AS organization_name
            FROM ride_notes rn
            LEFT JOIN users u ON u.id = rn.expert_user_id
            LEFT JOIN organizations o ON o.id = rn.organization_id
            WHERE rn.status = 'pending_review'
            ORDER BY rn.updated_at DESC, rn.created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT e.id, e.title, e.created_at, e.event_date, u.name AS host_name, u.email AS host_email
            FROM events e
            LEFT JOIN users u ON u.id = e.host_user_id
            WHERE e.created_at >= NOW() - INTERVAL '7 days'
              AND e.event_date >= NOW()
            ORDER BY e.created_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT id, title, event_date, organizer_name
            FROM events
            WHERE event_date >= NOW()
              AND event_date <= NOW() + INTERVAL '7 days'
            ORDER BY event_date ASC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT ep.id, ep.participant_name, ep.participant_email, ep.joined_at, e.title AS event_title
            FROM event_participants ep
            JOIN events e ON e.id = ep.event_id
            ORDER BY ep.joined_at DESC
            LIMIT 5
            `
          ),
          pool.query(
            `
            SELECT b.id, b.spots, b.status, b.created_at, e.title AS event_title, u.name AS participant_name, u.email AS participant_email
            FROM bookings b
            JOIN events e ON e.id = b.event_id
            JOIN users u ON u.id = b.user_id
            WHERE b.status <> 'cancelled'
            ORDER BY b.created_at DESC
            LIMIT 5
            `
          ),
        ]);

      expertApps.rows.forEach((row) => {
        notifications.push({
          id: `expert-application-${row.id}`,
          type: 'expert_application',
          title: 'Expert application pending',
          description: `${row.name || row.email} is waiting for review.`,
          href: '/admin#requests',
          createdAt: toIsoDate(row.created_at),
          tone: 'warning',
        });
      });

      storeRequests.rows.forEach((row) => {
        notifications.push({
          id: `store-request-${row.id}`,
          type: 'store_request',
          title: 'Bike shop request pending',
          description: `${row.store_name} in ${row.city || 'Kathmandu'} needs admin review.`,
          href: '/admin#requests',
          createdAt: toIsoDate(row.created_at),
          tone: 'warning',
        });
      });

      trailRequests.rows.forEach((row) => {
        notifications.push({
          id: `trail-request-${row.id}`,
          type: 'trail_request',
          title: 'Trail help request',
          description: `${row.requester_name || row.requester_email || 'A rider'} requested help for ${row.trail_name}.`,
          href: '/admin#requests',
          createdAt: toIsoDate(row.created_at),
          tone: 'info',
        });
      });

      pendingTrails.rows.forEach((row) => {
        notifications.push({
          id: `pending-trail-${row.id}`,
          type: 'pending_trail',
          title: 'Trail pending approval',
          description: `${row.name} is waiting in the trail moderation queue.`,
          href: '/admin#operations',
          createdAt: toIsoDate(row.created_at),
          tone: 'warning',
        });
      });

      rideRequests.rows.forEach((row) => {
        notifications.push({
          id: `admin-ride-request-${row.id}`,
          type: 'ride_program_request',
          title: 'Ride with Experts request',
          description: `${row.requester_name || row.requester_email || 'A participant'} requested ${row.program_title}.`,
          href: '/admin#operations',
          createdAt: toIsoDate(row.created_at),
          tone: 'info',
        });
      });

      paymentProofs.rows.forEach((row) => {
        notifications.push({
          id: `payment-proof-${row.id}`,
          type: 'payment_review',
          title: 'Payment proof needs review',
          description: `${row.event_title} has a submitted payment proof.`,
          href: '/admin#operations',
          createdAt: toIsoDate(row.proof_submitted_at || row.created_at),
          tone: 'warning',
        });
      });

      recentEvents.rows.forEach((row) => {
        notifications.push({
          id: `event-created-${row.id}`,
          type: 'event_created',
          title: 'New event created',
          description: `${row.title} was added${row.host_name || row.host_email ? ` by ${row.host_name || row.host_email}` : ''}.`,
          href: '/admin#content',
          createdAt: toIsoDate(row.created_at),
          tone: 'info',
        });
      });

      upcomingEvents.rows.forEach((row) => {
        notifications.push({
          id: `event-upcoming-${row.id}`,
          type: 'event_upcoming',
          title: 'Event coming up this week',
          description: `${row.title} is scheduled soon${row.organizer_name ? ` by ${row.organizer_name}` : ''}.`,
          href: '/admin#content',
          createdAt: new Date().toISOString(),
          tone: 'warning',
        });
      });

      eventParticipants.rows.forEach((row) => {
        notifications.push({
          id: `admin-event-participant-${row.id}`,
          type: 'event_participant',
          title: 'New event participant',
          description: `${row.participant_name || row.participant_email || 'A participant'} joined ${row.event_title}.`,
          href: '/admin#content',
          createdAt: toIsoDate(row.joined_at),
          tone: 'success',
        });
      });

      eventBookings.rows.forEach((row) => {
        notifications.push({
          id: `admin-event-booking-${row.id}`,
          type: 'event_booking',
          title: 'New event booking',
          description: `${row.participant_name || row.participant_email || 'A participant'} booked ${row.spots || 1} spot(s) for ${row.event_title}.`,
          href: '/admin#content',
          createdAt: toIsoDate(row.created_at),
          tone: row.status === 'confirmed' ? 'success' : 'warning',
        });
      });

      rideNotes.rows.forEach((row) => {
        notifications.push({
          id: `ride-note-review-${row.id}`,
          type: 'ride_note_review',
          title: 'Ride Note pending review',
          description: `${row.title} from ${row.expert_name || row.expert_email || row.organization_name || 'a contributor'} needs approval.`,
          href: '/admin#content',
          createdAt: toIsoDate(row.updated_at || row.created_at),
          tone: 'warning',
        });
      });
    }

    if (auth.role === 'expert') {
      const [trailRequests, eventJoins, rideRequests, rideNotes] = await Promise.all([
        pool.query(
          `
          SELECT tir.id, tir.requester_name, tir.requester_email, t.name AS trail_name, tir.created_at
          FROM trail_interest_requests tir
          JOIN trails t ON t.id = tir.trail_id
          WHERE tir.assigned_expert_user_id = $1
          ORDER BY tir.created_at DESC
          LIMIT 5
          `,
          [auth.sub]
        ),
        pool.query(
          `
          SELECT ep.id, ep.participant_name, ep.participant_email, ep.joined_at, e.title
          FROM event_participants ep
          JOIN events e ON e.id = ep.event_id
          WHERE e.host_user_id = $1
          ORDER BY ep.joined_at DESC
          LIMIT 5
          `,
          [auth.sub]
        ),
        pool.query(
          `
          SELECT r.id, r.requester_name, r.requester_email, r.status, r.created_at, p.title AS program_title, t.name AS trail_name
          FROM expert_ride_program_requests r
          JOIN expert_ride_programs p ON p.id = r.program_id
          JOIN trails t ON t.id = r.trail_id
          WHERE r.expert_user_id = $1
            AND r.status IN ('pending', 'accepted')
          ORDER BY r.created_at DESC
          LIMIT 5
          `,
          [auth.sub]
        ),
        pool.query(
          `
          SELECT id, title, slug, status, published_at, updated_at, created_at
          FROM ride_notes
          WHERE expert_user_id = $1
            AND author_user_id = $1
            AND status IN ('pending_review', 'published', 'rejected')
          ORDER BY COALESCE(published_at, updated_at, created_at) DESC
          LIMIT 5
          `,
          [auth.sub]
        ),
      ]);

      trailRequests.rows.forEach((row) => {
        notifications.push({
          id: `expert-trail-request-${row.id}`,
          type: 'trail_request',
          title: 'Trail request assigned to you',
          description: `${row.requester_name || row.requester_email || 'A rider'} requested help for ${row.trail_name}.`,
          href: '/experts/me#trail-requests',
          createdAt: toIsoDate(row.created_at),
          tone: 'warning',
        });
      });

      eventJoins.rows.forEach((row) => {
        notifications.push({
          id: `event-join-${row.id}`,
          type: 'event_join',
          title: 'New event participant',
          description: `${row.participant_name || row.participant_email || 'A participant'} joined ${row.title}.`,
          href: '/experts/me#trail-requests',
          createdAt: toIsoDate(row.joined_at),
          tone: 'success',
        });
      });

      rideRequests.rows.forEach((row) => {
        notifications.push({
          id: `expert-ride-request-${row.id}`,
          type: 'ride_program_request',
          title: row.status === 'pending' ? 'Ride request needs response' : 'Accepted ride request is active',
          description: `${row.requester_name || row.requester_email || 'A participant'} requested ${row.program_title || row.trail_name}.`,
          href: '/experts/me#trail-requests',
          createdAt: toIsoDate(row.created_at),
          tone: row.status === 'pending' ? 'warning' : 'info',
        });
      });

      rideNotes.rows.forEach((row) => {
        const status = String(row.status || '');
        notifications.push({
          id: `expert-ride-note-${row.id}-${status}`,
          type: 'ride_note',
          title:
            status === 'published'
              ? 'Ride Note published'
              : status === 'rejected'
                ? 'Ride Note needs changes'
                : 'Ride Note waiting for review',
          description:
            status === 'published'
              ? `${row.title} is now live on Ride Notes.`
              : status === 'rejected'
                ? `${row.title} was not approved yet. Review it from your expert profile.`
                : `${row.title} is in the admin review queue.`,
          href: status === 'published' && row.slug ? `/ride-notes/${row.slug}` : '/experts/me#ride-notes',
          createdAt: toIsoDate(row.published_at || row.updated_at || row.created_at),
          tone: status === 'published' ? 'success' : status === 'rejected' ? 'danger' : 'info',
        });
      });
    }

    if (auth.role === 'participant') {
      const [rideRequests, bookings, joinedEvents] = await Promise.all([
        pool.query(
          `
          SELECT r.id, r.status, r.updated_at, r.created_at, p.title AS program_title, u.name AS expert_name
          FROM expert_ride_program_requests r
          JOIN expert_ride_programs p ON p.id = r.program_id
          JOIN users u ON u.id = r.expert_user_id
          WHERE r.requester_user_id = $1
          ORDER BY r.updated_at DESC, r.created_at DESC
          LIMIT 5
          `,
          [auth.sub]
        ),
        pool.query(
          `
          SELECT b.id, b.status, b.created_at, e.title AS event_title, p.status AS payment_status, p.proof_submitted_at
          FROM bookings b
          JOIN events e ON e.id = b.event_id
          LEFT JOIN LATERAL (
            SELECT status, proof_submitted_at
            FROM payments
            WHERE booking_id = b.id
            ORDER BY created_at DESC
            LIMIT 1
          ) p ON TRUE
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC
          LIMIT 5
          `,
          [auth.sub]
        ),
        pool.query(
          `
          SELECT ep.id, ep.joined_at, e.title, e.event_date
          FROM event_participants ep
          JOIN events e ON e.id = ep.event_id
          WHERE lower(ep.participant_email) = lower($1)
            AND e.event_date >= NOW()
          ORDER BY e.event_date ASC
          LIMIT 5
          `,
          [auth.email]
        ),
      ]);

      rideRequests.rows.forEach((row) => {
        const status = String(row.status || 'pending');
        notifications.push({
          id: `participant-ride-request-${row.id}`,
          type: 'ride_program_request',
          title: status === 'pending' ? 'Ride request sent' : `Ride request ${status}`,
          description: `${row.program_title} with ${row.expert_name || 'an expert'}.`,
          href: '/participants/me',
          createdAt: toIsoDate(row.updated_at || row.created_at),
          tone: status === 'accepted' ? 'success' : status === 'declined' || status === 'cancelled' ? 'danger' : 'info',
        });
      });

      bookings.rows.forEach((row) => {
        const paymentStatus = String(row.payment_status || 'none');
        const needsPaymentAction = row.status === 'pending' || paymentStatus === 'pending';
        notifications.push({
          id: `participant-booking-${row.id}`,
          type: 'booking',
          title: needsPaymentAction ? 'Booking payment pending' : 'Booking update',
          description: `${row.event_title} is ${row.status}${paymentStatus !== 'none' ? ` / payment ${paymentStatus}` : ''}.`,
          href: '/participants/me',
          createdAt: toIsoDate(row.proof_submitted_at || row.created_at),
          tone: needsPaymentAction ? 'warning' : paymentStatus === 'paid' ? 'success' : 'info',
        });
      });

      joinedEvents.rows.forEach((row) => {
        notifications.push({
          id: `participant-event-${row.id}`,
          type: 'event',
          title: 'Upcoming joined event',
          description: `${row.title} is scheduled soon.`,
          href: '/participants/me',
          createdAt: toIsoDate(row.event_date || row.joined_at),
          tone: 'info',
        });
      });
    }

    if (auth.role !== 'admin') {
      const organizationItems = await pool.query(
        `
        SELECT om.id, om.role, om.created_at, o.name
        FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = $1
          AND om.status = 'active'
          AND o.is_active = TRUE
        ORDER BY om.created_at DESC
        LIMIT 3
        `,
        [auth.sub]
      );

      organizationItems.rows.forEach((row) => {
        notifications.push({
          id: `organization-access-${row.id}`,
          type: 'organization',
          title: 'Organization access active',
          description: `You can manage ${row.name} as ${String(row.role).replace('org_', '')}.`,
          href: '/trail-builders/me',
          createdAt: toIsoDate(row.created_at),
          tone: 'info',
        });
      });
    }

    const recentNotifications = sortAndLimit(notifications);

    return NextResponse.json(
      {
        notifications: recentNotifications,
        unreadCount: recentNotifications.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
