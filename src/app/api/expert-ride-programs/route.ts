import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { ExpertRideProgram } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const expertId = searchParams.get('expert');
    const trailId = searchParams.get('trail');
    const params: unknown[] = [];
    let paramIndex = 1;

    let where = `
      WHERE p.is_active = TRUE
        AND u.role = 'expert'
        AND u.is_verified_expert = TRUE
        AND COALESCE(u.is_hidden, FALSE) = FALSE
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
        AND EXISTS (
          SELECT 1
          FROM expert_trails et
          WHERE et.expert_user_id = p.expert_user_id
            AND et.trail_id = p.trail_id
        )
    `;

    if (expertId) {
      where += ` AND p.expert_user_id = $${paramIndex}`;
      params.push(expertId);
      paramIndex++;
    }

    if (trailId) {
      where += ` AND p.trail_id = $${paramIndex}`;
      params.push(trailId);
      paramIndex++;
    }

    const result = await pool.query(
      `
      SELECT
        p.*,
        u.name AS expert_name,
        u.email AS expert_email,
        u.city AS expert_city,
        u.bio AS expert_bio,
        u.profile_photo_url AS expert_profile_photo_url,
        u.availability_weekdays AS expert_availability_weekdays,
        COALESCE(er.average_rating, 0) AS average_rating,
        COALESCE(er.review_count, 0) AS review_count,
        t.name AS trail_name,
        t.slug AS trail_slug,
        t.location AS trail_location,
        t.sport_type AS trail_sport_type,
        t.difficulty AS trail_difficulty,
        t.image_url AS trail_image_url
      FROM expert_ride_programs p
      JOIN users u ON u.id = p.expert_user_id
      JOIN trails t ON t.id = p.trail_id
      LEFT JOIN (
        SELECT expert_user_id, AVG(rating)::float AS average_rating, COUNT(*)::int AS review_count
        FROM expert_reviews
        GROUP BY expert_user_id
      ) er ON er.expert_user_id = p.expert_user_id
      ${where}
      ORDER BY p.created_at DESC
      `,
      params
    );

    const programs: ExpertRideProgram[] = result.rows.map((row: any) => ({
      ...row,
      price_npr: row.price_npr === null ? null : Number(row.price_npr),
      max_group_size: Number(row.max_group_size || 1),
      availability_weekdays: Array.isArray(row.availability_weekdays)
        ? row.availability_weekdays
        : [],
      average_rating: Number(row.review_count || 0) > 0 ? Number(row.average_rating || 0) : 5,
      review_count: Number(row.review_count || 0),
      expert_availability_weekdays: Array.isArray(row.expert_availability_weekdays)
        ? row.expert_availability_weekdays
        : [],
    }));

    return NextResponse.json({ programs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert ride programs:', error);
    return NextResponse.json({ error: 'Failed to fetch ride programs' }, { status: 500 });
  }
}
