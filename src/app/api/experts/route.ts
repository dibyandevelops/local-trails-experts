import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SportType, User } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const sport = searchParams.get('sport') as SportType | null;
    const id = searchParams.get('id');
    const verified = searchParams.get('verified') === 'true';

    const params: any[] = [];
    let paramIndex = 1;

    let where = 'WHERE u.role = \'expert\' AND COALESCE(u.is_hidden, FALSE) = FALSE';

    if (id) {
      where += ` AND u.id = $${paramIndex}`;
      params.push(id);
      paramIndex++;
    }

    if (city) {
      where += ` AND u.city = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }

    if (sport) {
      // sports is stored as JSONB array, we check membership
      where += ` AND u.sports @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify([sport]));
      paramIndex++;
    }

    if (verified) {
      where += ` AND u.is_verified_expert = TRUE`;
    }

    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.bio,
        u.city,
        u.sports,
        u.is_verified_expert,
        u.is_hidden,
        u.profile_photo_url,
        u.expert_gallery_photos,
        u.verification_years_experience,
        u.verification_certifications,
        u.verification_guiding_history,
        u.verification_safety_training,
        u.verification_achievements,
        u.verification_strava_url,
        u.verification_links,
        u.created_at,
        u.updated_at,
        COALESCE(er.average_rating, 0) AS average_rating,
        COALESCE(er.review_count, 0) AS review_count,
        COALESCE(expert_events.events, '[]'::json) AS events,
        COALESCE(expert_trails.associated_trails, '[]'::json) AS associated_trails
      FROM users u
      LEFT JOIN (
        SELECT
          expert_user_id,
          AVG(rating)::float AS average_rating,
          COUNT(*)::int AS review_count
        FROM expert_reviews
        GROUP BY expert_user_id
      ) er ON er.expert_user_id = u.id
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'id', e.id,
              'title', e.title,
              'city', e.city,
              'sport_type', e.sport_type,
              'price_npr', e.price_npr,
              'event_date', e.event_date
            )
            ORDER BY e.event_date ASC
          ) AS events
        FROM events e
        WHERE e.host_user_id = u.id
      ) expert_events ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'id', t.id,
              'slug', t.slug,
              'name', t.name,
              'location', t.location,
              'sport_type', t.sport_type,
              'difficulty', t.difficulty,
              'distance_km', t.distance_km,
              'elevation_gain_m', t.elevation_gain_m,
              'image_url', t.image_url
            )
            ORDER BY et.sort_order ASC, et.created_at DESC
          ) AS associated_trails
        FROM expert_trails et
        JOIN trails t ON t.id = et.trail_id
        WHERE et.expert_user_id = u.id
          AND t.status = 'approved'
          AND t.is_hidden = FALSE
          AND t.sport_type NOT IN ('local_tour')
      ) expert_trails ON TRUE
      ${where}
      ORDER BY u.is_verified_expert DESC, u.created_at DESC
    `;

    const result = await pool.query(query, params);

    const experts = result.rows.map((row: any) => {
      const reviewCount = Number(row.review_count || 0);
      const averageRating =
        reviewCount > 0 ? Number(row.average_rating || 0) : 5;
      const user: User = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        bio: row.bio,
        city: row.city,
        sports: row.sports,
        is_verified_expert: row.is_verified_expert,
        is_hidden: row.is_hidden,
        profile_photo_url: row.profile_photo_url,
        expert_gallery_photos: Array.isArray(row.expert_gallery_photos)
          ? row.expert_gallery_photos
          : [],
        verification_years_experience: row.verification_years_experience,
        verification_certifications: row.verification_certifications,
        verification_guiding_history: row.verification_guiding_history,
        verification_safety_training: row.verification_safety_training,
        verification_achievements: row.verification_achievements,
        verification_strava_url: row.verification_strava_url,
        verification_links: row.verification_links,
        average_rating: averageRating,
        review_count: reviewCount,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      return {
        ...user,
        events: row.events || [],
        associated_trails: row.associated_trails || [],
      };
    });

    return NextResponse.json({ experts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching experts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experts' },
      { status: 500 }
    );
  }
}
