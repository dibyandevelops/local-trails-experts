import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getExpertId(context: RouteContext) {
  const { id } = await context.params;
  return id;
}

async function assertAdminAndExpert(request: NextRequest, expertId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || auth.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!uuidPattern.test(expertId)) {
    return { error: NextResponse.json({ error: 'Invalid expert id.' }, { status: 400 }) };
  }

  const expertResult = await pool.query(
    `
    SELECT id, name, email, role
    FROM users
    WHERE id = $1
      AND role = 'expert'
    LIMIT 1
    `,
    [expertId]
  );

  const expert = expertResult.rows[0];
  if (!expert) {
    return { error: NextResponse.json({ error: 'Expert not found.' }, { status: 404 }) };
  }

  return { expert };
}

async function fetchAssociatedTrails(expertId: string) {
  const associatedResult = await pool.query(
    `
    SELECT
      t.id,
      t.slug,
      t.name,
      t.location,
      t.sport_type,
      t.difficulty,
      t.created_at,
      t.is_hidden,
      et.sort_order
    FROM expert_trails et
    JOIN trails t ON t.id = et.trail_id
    WHERE et.expert_user_id = $1
      AND t.status = 'approved'
      AND t.is_hidden = FALSE
      AND t.sport_type NOT IN ('local_tour')
    ORDER BY et.sort_order ASC, et.created_at DESC
    `,
    [expertId]
  );

  return associatedResult.rows || [];
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const expertId = await getExpertId(context);
    const guard = await assertAdminAndExpert(request, expertId);
    if (guard.error) return guard.error;

    const [associatedTrails, availableResult] = await Promise.all([
      fetchAssociatedTrails(expertId),
      pool.query(
        `
        SELECT id, slug, name, location, sport_type, difficulty, created_at, is_hidden
        FROM trails
        WHERE status = 'approved'
          AND is_hidden = FALSE
          AND sport_type NOT IN ('local_tour')
        ORDER BY name ASC
        LIMIT 250
        `
      ),
    ]);

    return NextResponse.json(
      {
        expert: guard.expert,
        associated_trails: associatedTrails,
        available_trails: availableResult.rows || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin expert trails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert trails' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const client = await pool.connect();
  try {
    const expertId = await getExpertId(context);
    const guard = await assertAdminAndExpert(request, expertId);
    if (guard.error) return guard.error;

    const body = (await request.json()) as { trail_ids?: unknown };
    if (!Array.isArray(body.trail_ids)) {
      return NextResponse.json(
        { error: 'trail_ids must be an array.' },
        { status: 400 }
      );
    }

    const trailIds = Array.from(
      new Set(
        body.trail_ids
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

    if (trailIds.some((trailId) => !uuidPattern.test(trailId))) {
      return NextResponse.json(
        { error: 'One or more selected trail ids are invalid.' },
        { status: 400 }
      );
    }

    if (trailIds.length > 12) {
      return NextResponse.json(
        { error: 'You can associate up to 12 trails.' },
        { status: 400 }
      );
    }

    if (trailIds.length > 0) {
      const validResult = await client.query(
        `
        SELECT id
        FROM trails
        WHERE id = ANY($1::uuid[])
          AND status = 'approved'
          AND is_hidden = FALSE
          AND sport_type NOT IN ('local_tour')
        `,
        [trailIds]
      );
      const validIds = new Set(validResult.rows.map((row: { id: string }) => row.id));
      const invalidIds = trailIds.filter((trailId) => !validIds.has(trailId));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'One or more selected trails are not available.' },
          { status: 400 }
        );
      }
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM expert_trails WHERE expert_user_id = $1', [expertId]);

    if (trailIds.length > 0) {
      await client.query(
        `
        INSERT INTO expert_trails (expert_user_id, trail_id, sort_order)
        SELECT $1::uuid, value::uuid, ordinality::int - 1
        FROM unnest($2::uuid[]) WITH ORDINALITY AS selected(value, ordinality)
        `,
        [expertId, trailIds]
      );
    }

    const associatedResult = await client.query(
      `
      SELECT
        t.id,
        t.slug,
        t.name,
        t.location,
        t.sport_type,
        t.difficulty,
        t.created_at,
        t.is_hidden,
        et.sort_order
      FROM expert_trails et
      JOIN trails t ON t.id = et.trail_id
      WHERE et.expert_user_id = $1
        AND t.status = 'approved'
        AND t.is_hidden = FALSE
        AND t.sport_type NOT IN ('local_tour')
      ORDER BY et.sort_order ASC, et.created_at DESC
      `,
      [expertId]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { associated_trails: associatedResult.rows || [] },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error updating admin expert trails:', error);
    return NextResponse.json(
      { error: 'Failed to update expert trails' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
