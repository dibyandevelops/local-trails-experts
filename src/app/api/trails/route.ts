import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Trail } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeSafetyLabels } from '@/lib/trail-safety';
import { parseGPX } from '@/lib/gpx-parser';
import { DEFAULT_TRAIL_SPORT } from '@/services/constants/sports';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

function parseOptionalNumber(raw: string | null) {
  if (!raw || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKomootEmbedInput(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  if (value.includes('<iframe')) {
    const match = value.match(/src=["']([^"']+)["']/i);
    return match?.[1]?.trim() || '';
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty');
    const location = searchParams.get('location');
    const sport = searchParams.get('sport');
    const lat = parseOptionalNumber(searchParams.get('lat'));
    const lng = parseOptionalNumber(searchParams.get('lng'));
    const radiusKm = parseOptionalNumber(searchParams.get('radiusKm'));
    const hasUserCoords = lat !== null && lng !== null;
    const sort = (searchParams.get('sort') || '').trim();
    const distanceMinRaw = searchParams.get('distanceMin');
    const distanceMaxRaw = searchParams.get('distanceMax');
    const status = searchParams.get('status');
    const hazardous = searchParams.get('hazardous') === 'true';
    const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
    const offsetParam = parseOptionalNumber(searchParams.get('offset'));
    const pageSizeRaw = Number(searchParams.get('pageSize') || '12') || 12;
    const pageSize = Math.min(50, Math.max(1, pageSizeRaw));
    const offset =
      offsetParam !== null && offsetParam >= 0
        ? Math.floor(offsetParam)
        : (page - 1) * pageSize;

    let whereClause = ' WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    let distanceExpr = 'NULL::double precision';
    let distanceOrderBy = '';

    if (hasUserCoords) {
      const latParam = paramIndex++;
      params.push(lat);
      const lngParam = paramIndex++;
      params.push(lng);
      distanceExpr = `
        6371 * acos(
          LEAST(
            1,
            GREATEST(
              -1,
              cos(radians($${latParam})) * cos(radians(t.latitude)) *
              cos(radians(t.longitude) - radians($${lngParam})) +
              sin(radians($${latParam})) * sin(radians(t.latitude))
            )
          )
        )
      `;
      distanceOrderBy = 'distance_from_user_km ASC NULLS LAST, t.name ASC';

      if (radiusKm !== null && radiusKm > 0) {
        whereClause += ` AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL AND (${distanceExpr}) <= $${paramIndex}`;
        params.push(radiusKm);
        paramIndex++;
      }
    }

    // Temporary: hide local tours from the main listing.
    whereClause += ` AND t.sport_type NOT IN ('local_tour')`;

    if (search) {
      whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex} OR t.location ILIKE $${paramIndex})`;
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

    if (distanceMinRaw) {
      const min = Number(distanceMinRaw);
      if (Number.isFinite(min)) {
        whereClause += ` AND t.distance_km IS NOT NULL AND t.distance_km >= $${paramIndex}`;
        params.push(min);
        paramIndex++;
      }
    }

    if (distanceMaxRaw) {
      const max = Number(distanceMaxRaw);
      if (Number.isFinite(max)) {
        whereClause += ` AND t.distance_km IS NOT NULL AND t.distance_km <= $${paramIndex}`;
        params.push(max);
        paramIndex++;
      }
    }

    if (hazardous) {
      whereClause += ` AND t.is_hazardous = TRUE`;
    }

    if (auth?.role === 'admin' && status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    } else if (auth?.role === 'admin') {
      whereClause += ` AND status = 'approved'`;
    } else if (auth?.role === 'expert') {
      whereClause += ` AND (status = 'approved' AND is_hidden = FALSE OR t.submitted_by_user_id = $${paramIndex})`;
      params.push(auth.sub);
      paramIndex++;
    } else {
      whereClause += ` AND status = 'approved' AND is_hidden = FALSE`;
    }

    const orderBy = (() => {
      switch (sort) {
        case 'nearest':
          return hasUserCoords ? distanceOrderBy : 't.name ASC';
        case 'name_desc':
          return 't.name DESC';
        case 'distance_asc':
          return 't.distance_km ASC NULLS LAST, t.name ASC';
        case 'distance_desc':
          return 't.distance_km DESC NULLS LAST, t.name ASC';
        case 'elevation_desc':
          return 't.elevation_gain_m DESC NULLS LAST, t.name ASC';
        case 'newest':
          return 't.created_at DESC, t.name ASC';
        case 'name_asc':
        case '':
        default:
          return 't.name ASC';
      }
    })();

    const listQuery = `
      SELECT
        t.id,
        t.name,
        t.difficulty,
        t.sport_type,
        t.location,
        t.is_hazardous,
        t.distance_km,
        t.elevation_gain_m,
        t.estimated_time_hours,
        t.image_url,
        t.trail_images,
        t.komoot_embed_url,
        t.is_hidden,
        COALESCE(tr.review_count, 0) AS review_count,
        COALESCE(tr.average_rating, 0) AS average_rating
      FROM trails t
      LEFT JOIN (
        SELECT
          trail_id,
          AVG(rating)::float AS average_rating,
          COUNT(*)::int AS review_count
        FROM trail_reviews
        GROUP BY trail_id
      ) tr ON tr.trail_id = t.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const listParams = [...params, pageSize, offset];

    const countQuery = `SELECT COUNT(*)::int AS total FROM trails t ${whereClause}`;

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
          page: Math.floor(offset / pageSize) + 1,
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
    const komoot_embed_url = normalizeKomootEmbedInput(
      String(formData.get('komoot_embed_url') || '')
    );
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
    const latitudeOverride = parseOptionalNumber(
      String(formData.get('latitude') || '')
    );
    const longitudeOverride = parseOptionalNumber(
      String(formData.get('longitude') || '')
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

    const nameCheck = await pool.query(
      'SELECT id FROM trails WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [name]
    );
    if (nameCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Trail name already exists. Please choose another name.' },
        { status: 409 }
      );
    }

    const isAdmin = auth?.role === 'admin';
    const isExpert = auth?.role === 'expert';

    const routeData = await parseGPX(await gpxFile.text());
    const firstPoint = routeData.coordinates[0];
    const latitude = latitudeOverride ?? firstPoint?.latitude ?? null;
    const longitude = longitudeOverride ?? firstPoint?.longitude ?? null;
    const distance_km = distanceOverride ?? routeData.totalDistance ?? null;
    const elevation_gain_m =
      elevationOverride ?? routeData.elevationGain ?? null;

    // Get submitter info if authenticated
    let submitter = null;
    let submitterEmail = null;
    let submitterVerified = false;
    if (auth?.sub) {
      const submitterResult = await pool.query(
        'SELECT name, email, is_verified_expert FROM users WHERE id = $1 LIMIT 1',
        [auth.sub]
      );
      submitter = submitterResult.rows[0];
      submitterEmail = submitter?.email;
      submitterVerified = Boolean(submitter?.is_verified_expert);
    }

    // Auto-approve trails created by admins or experts (unverified experts are hidden first)
    const shouldAutoApprove = isAdmin || isExpert;
    const trailStatus = shouldAutoApprove ? 'approved' : 'pending';
    const isHidden = isExpert && !submitterVerified;

    const result = await pool.query(
      `
      INSERT INTO trails (
        name, description, difficulty, location, latitude, longitude,
        distance_km, elevation_gain_m, estimated_time_hours, image_url, trail_images, komoot_embed_url, safety_labels, route_data, sport_type,
        status, submitted_by_user_id, approved_by_admin_id, approved_at, is_hidden
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20)
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
        komoot_embed_url || null,
        // Public: anyone can submit safety labels; admins can still edit later.
        normalizeSafetyLabels(safetyLabelsInput),
        JSON.stringify(routeData),
        sport_type,
        trailStatus,
        auth?.sub || null,
        isAdmin && auth?.sub ? auth.sub : null,
        isAdmin && auth?.sub ? new Date() : null,
        isHidden,
      ]
    );

    // Send notification email for pending trails
    if (trailStatus === 'pending') {
      const adminEmail =
        (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim();
      const adminEmails = adminEmail ? [adminEmail] : [];
      const { sendEmailSafe } = await import('@/lib/email');
      const approvalEmail = buildBrandedEmail({
        subject: `Trail approval needed (${sport_type})`,
        appUrl: getAppUrl(),
        headline: 'Trail approval needed',
        subhead: name,
        bodyHtml: `A new trail has been submitted for approval.<br/><br/><strong>Trail:</strong> ${name}<br/><strong>Sport:</strong> ${sport_type}<br/><strong>Submitted by:</strong> ${submitter?.name || 'Anonymous'} (${submitterEmail || 'No email'})<br/><strong>Location:</strong> ${location}<br/>Please review in the admin console.`,
        bodyText: `A new trail has been submitted for approval.\n\nTrail: ${name}\nSport: ${sport_type}\nSubmitted by: ${submitter?.name || 'Anonymous'} (${submitterEmail || 'No email'})\nLocation: ${location}\nPlease review in admin console.`,
      });
      const dedupeKey = `trail-approval:${name}:${sport_type}:${submitterEmail || 'anonymous'}`;
      if (adminEmails.length > 0) {
        await Promise.all(
          adminEmails.map((to: string) =>
            sendEmailSafe({
              to,
              ...approvalEmail,
              dedupeKey,
            })
          )
        );
      }
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
