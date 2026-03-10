import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Trail } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeSafetyLabels } from '@/lib/trail-safety';
import { parseGPX } from '@/lib/gpx-parser';
import { DEFAULT_TRAIL_SPORT } from '@/services/constants/sports';

function parseOptionalNumber(raw: string | null) {
  if (!raw || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty');
    const location = searchParams.get('location');
    const sport = searchParams.get('sport');
    const status = searchParams.get('status');
    const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
    const pageSizeRaw = Number(searchParams.get('pageSize') || '12') || 12;
    const pageSize = Math.min(50, Math.max(1, pageSizeRaw));
    const offset = (page - 1) * pageSize;

    let whereClause = ' WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (difficulty) {
      whereClause += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (location) {
      whereClause += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (sport) {
      whereClause += ` AND sport_type = $${paramIndex}`;
      params.push(sport);
      paramIndex++;
    }

    if (auth?.role === 'admin' && status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    } else if (auth?.role === 'admin') {
      whereClause += ` AND status = 'approved'`;
    } else {
      whereClause += ` AND status = 'approved' AND is_hidden = FALSE`;
    }

    const listQuery = `
      SELECT t.*, u.name as created_by
      FROM trails t
      LEFT JOIN users u ON t.submitted_by_user_id = u.id
      ${whereClause}
      ORDER BY t.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const listParams = [...params, pageSize, offset];

    const countQuery = `SELECT COUNT(*)::int AS total FROM trails ${whereClause}`;

    const [result, countResult] = await Promise.all([
      pool.query(listQuery, listParams),
      pool.query(countQuery, params),
    ]);
    const trails: Trail[] = result.rows;
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json(
      {
        trails,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching trails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trails' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get optional auth - create trail is now public
    const auth = getAuthFromRequest(request);

    // Parse the form data first to check required fields
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'GPX upload is required. Submit as multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const difficulty = String(formData.get('difficulty') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const sport_type =
      String(formData.get('sport_type') || '').trim() || DEFAULT_TRAIL_SPORT;
    const image_url = String(formData.get('image_url') || '').trim();
    const rawTrailImages = String(formData.get('trail_images') || '').trim();
    let trailImagesInput: string[] = [];
    if (rawTrailImages) {
      try {
        const parsed = JSON.parse(rawTrailImages) as unknown;
        if (Array.isArray(parsed)) {
          trailImagesInput = parsed.filter(
            (value): value is string => typeof value === 'string' && value.length > 0
          );
        }
      } catch {
        trailImagesInput = [];
      }
    }
    const estimated_time_hours = parseOptionalNumber(
      String(formData.get('estimated_time_hours') || '')
    );
    const distanceOverride = parseOptionalNumber(
      String(formData.get('distance_km') || '')
    );
    const elevationOverride = parseOptionalNumber(
      String(formData.get('elevation_gain_m') || '')
    );

    const rawSafety = String(formData.get('safety_labels') || '').trim();
    let safetyLabelsInput: unknown = [];
    if (rawSafety) {
      try {
        safetyLabelsInput = JSON.parse(rawSafety);
      } catch {
        safetyLabelsInput = [];
      }
    }

    const gpxFile = formData.get('gpx_file') as File | null;
    if (!gpxFile) {
      return NextResponse.json(
        { error: 'GPX file is required.' },
        { status: 400 }
      );
    }
    if (!gpxFile.name.toLowerCase().endsWith('.gpx')) {
      return NextResponse.json(
        { error: 'Only GPX files are supported.' },
        { status: 400 }
      );
    }

    if (!name || !difficulty || !location || !sport_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, difficulty, location, sport_type' },
        { status: 400 }
      );
    }

    const isAdmin = auth?.role === 'admin';
    const isExpert = auth?.role === 'expert';

    const routeData = await parseGPX(await gpxFile.text());
    const firstPoint = routeData.coordinates[0];
    const latitude = firstPoint?.latitude ?? null;
    const longitude = firstPoint?.longitude ?? null;
    const distance_km = distanceOverride ?? routeData.totalDistance ?? null;
    const elevation_gain_m =
      elevationOverride ?? routeData.elevationGain ?? null;

    // Get submitter info if authenticated
    let submitter = null;
    let submitterEmail = null;
    if (auth?.sub) {
      const submitterResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1 LIMIT 1',
        [auth.sub]
      );
      submitter = submitterResult.rows[0];
      submitterEmail = submitter?.email;
    }

    // Auto-approve trails created by admins or experts
    const shouldAutoApprove = isAdmin || isExpert;
    const trailStatus = shouldAutoApprove ? 'approved' : 'pending';

    const result = await pool.query(
      `
      INSERT INTO trails (
        name, description, difficulty, location, latitude, longitude,
        distance_km, elevation_gain_m, estimated_time_hours, image_url, trail_images, safety_labels, route_data, sport_type,
        status, submitted_by_user_id, approved_by_admin_id, approved_at, is_hidden
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19)
      RETURNING *
      `,
      [
        name,
        description || null,
        difficulty,
        location,
        latitude,
        longitude,
        distance_km,
        elevation_gain_m,
        estimated_time_hours ?? null,
        image_url || trailImagesInput[0] || null,
        trailImagesInput,
        // Public: anyone can submit safety labels; admins can still edit later.
        normalizeSafetyLabels(safetyLabelsInput),
        JSON.stringify(routeData),
        sport_type,
        trailStatus,
        auth?.sub || null,
        isAdmin && auth?.sub ? auth.sub : null,
        isAdmin && auth?.sub ? new Date() : null,
        false, // is_hidden default
      ]
    );

    // Send notification email for pending trails
    if (trailStatus === 'pending') {
      const adminsResult = await pool.query(
        `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`
      );
      const adminEmails = adminsResult.rows
        .map((row) => row.email)
        .filter(Boolean);
      const { sendEmailSafe } = await import('@/lib/email');
      await Promise.all(
        adminEmails.map((to: string) =>
          sendEmailSafe({
            to,
            subject: `Trail approval needed (${sport_type})`,
            text: `A new trail has been submitted for approval.\n\nTrail: ${name}\nSport: ${sport_type}\nSubmitted by: ${submitter?.name || 'Anonymous'} (${submitterEmail || 'No email'})\nLocation: ${location}\nPlease review in admin console.`,
            html: `<p>A new trail has been submitted for approval.</p><p><strong>Trail:</strong> ${name}</p><p><strong>Sport:</strong> ${sport_type}</p><p><strong>Submitted by:</strong> ${submitter?.name || 'Anonymous'} (${submitterEmail || 'No email'})</p><p><strong>Location:</strong> ${location}</p><p>Please review in admin console.</p>`,
          })
        )
      );
    }

    return NextResponse.json(
      {
        trail: result.rows[0],
        requiresApproval: trailStatus === 'pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating trail:', error);
    return NextResponse.json(
      { error: 'Failed to create trail' },
      { status: 500 }
    );
  }
}
