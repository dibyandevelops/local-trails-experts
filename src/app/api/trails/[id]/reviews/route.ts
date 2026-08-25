import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, 'trail-reviews-read', 60, 60);
  if (limited) return limited;
  try {
    const { id } = await params;

    const reviewsResult = await pool.query(
      `
      SELECT
        r.*,
        u.name AS reviewer_name,
        u.profile_photo_url AS reviewer_photo_url
      FROM trail_reviews r
      LEFT JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.trail_id = $1
      ORDER BY r.created_at DESC
      `,
      [id]
    );

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS average_rating,
        COUNT(*)::int AS count
      FROM trail_reviews
      WHERE trail_id = $1
      `,
      [id]
    );

    const summaryRow = summaryResult.rows[0] || { average_rating: 0, count: 0 };

    return NextResponse.json(
      {
        reviews: reviewsResult.rows,
        summary: {
          averageRating: Number(summaryRow.average_rating || 0),
          count: Number(summaryRow.count || 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching trail reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trail reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, 'trail-reviews-create', 10, 60);
  if (limited) return limited;

  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'participant' && auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only participants or admins can submit trail reviews.' },
        { status: 403 }
      );
    }

    const { id } = await params;
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
        FROM users u
        JOIN event_participants ep ON ep.participant_email = u.email
        JOIN events e ON e.id = ep.event_id
        WHERE u.id = $1
          AND e.trail_id = $2
        LIMIT 1
        `,
        [auth.sub, id]
      );
      if (eligibility.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              'You can review this trail only after you have joined a ride on it.',
          },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      `
      INSERT INTO trail_reviews (trail_id, reviewer_user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (trail_id, reviewer_user_id)
      DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
      `,
      [id, auth.sub, rating, comment]
    );

    return NextResponse.json({ review: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error submitting trail review:', error);
    return NextResponse.json(
      { error: 'Failed to submit trail review' },
      { status: 500 }
    );
  }
}
