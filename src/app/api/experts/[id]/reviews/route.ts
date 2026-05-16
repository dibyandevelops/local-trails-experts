import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reviewsResult = await pool.query(
      `
      SELECT
        r.*,
        u.name AS reviewer_name,
        u.profile_photo_url AS reviewer_photo_url
      FROM expert_reviews r
      LEFT JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.expert_user_id = $1
      ORDER BY r.created_at DESC
      `,
      [id]
    );

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS average_rating,
        COUNT(*)::int AS count
      FROM expert_reviews
      WHERE expert_user_id = $1
      `,
      [id]
    );

    const summaryRow = summaryResult.rows[0] || { average_rating: 0, count: 0 };
    const summaryCount = Number(summaryRow.count || 0);
    const summaryAverage = summaryCount > 0 ? Number(summaryRow.average_rating || 0) : 5;

    return NextResponse.json(
      {
        reviews: reviewsResult.rows,
        summary: {
          averageRating: summaryAverage,
          count: summaryCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expert reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'participant' && auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only participants or admins can submit expert reviews.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserResult = await pool.query(
      `
      SELECT id, role
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    const targetUser = targetUserResult.rows[0];
    if (!targetUser || targetUser.role !== 'expert') {
      return NextResponse.json({ error: 'Expert not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { rating?: number; comment?: string };
    const rating = Number(body.rating);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }

    const comment = body.comment?.trim() || null;

    if (auth.role === 'participant') {
      const eligibility = await pool.query(
        `
        SELECT 1
        FROM events e
        LEFT JOIN bookings b
          ON b.event_id = e.id
          AND b.user_id = $1
          AND b.status <> 'cancelled'
        LEFT JOIN users u
          ON u.id = $1
        LEFT JOIN event_participants ep
          ON ep.event_id = e.id
          AND ep.participant_email = u.email
        WHERE e.host_user_id = $2
          AND (b.id IS NOT NULL OR ep.id IS NOT NULL)
        LIMIT 1
        `,
        [auth.sub, id]
      );
      if (eligibility.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              'You can review this expert only after joining one of their rides.',
          },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      `
      INSERT INTO expert_reviews (expert_user_id, reviewer_user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (expert_user_id, reviewer_user_id)
      DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
      `,
      [id, auth.sub, rating, comment]
    );

    return NextResponse.json({ review: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error submitting expert review:', error);
    return NextResponse.json(
      { error: 'Failed to submit expert review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'participant' && auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only participants or admins can delete expert reviews.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const deleteResult = await pool.query(
      `
      DELETE FROM expert_reviews
      WHERE expert_user_id = $1
        AND reviewer_user_id = $2
      RETURNING id
      `,
      [id, auth.sub]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting expert review:', error);
    return NextResponse.json(
      { error: 'Failed to delete expert review' },
      { status: 500 }
    );
  }
}
