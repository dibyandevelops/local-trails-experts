import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { parseGPX } from '@/lib/gpx-parser';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const MAX_GPX_BYTES = 2 * 1024 * 1024;

function estimateTimeHours(distanceKm: number, elevationGainM: number) {
  const baseHours = distanceKm / 10;
  const climbHours = elevationGainM / 600;
  const estimate = baseHours + climbHours;
  return Number.isFinite(estimate) ? Number(estimate.toFixed(2)) : 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request, 'trail-route-upload', 10, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_GPX_BYTES * 2) {
      return NextResponse.json(
        { error: 'Upload is too large. Please use a smaller GPX file.' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if file is GPX or other supported format
    const fileName = file.name.toLowerCase();
    const isGPX = fileName.endsWith('.gpx');

    if (!isGPX) {
      return NextResponse.json(
        { error: 'Only GPX files are currently supported' },
        { status: 400 }
      );
    }
    if (file.size > MAX_GPX_BYTES) {
      return NextResponse.json(
        { error: 'GPX file is too large. Please keep it under 2 MB.' },
        { status: 413 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    if (fileContent.length > MAX_GPX_BYTES) {
      return NextResponse.json(
        { error: 'GPX file is too large. Please keep it under 2 MB.' },
        { status: 413 }
      );
    }

    // Parse GPX file
    const routeData = await parseGPX(fileContent);
    const distance_km = Number(routeData.totalDistance.toFixed(2));
    const elevation_gain_m = Math.round(routeData.elevationGain);
    const estimated_time_hours = estimateTimeHours(distance_km, elevation_gain_m);

    // Update trail with route data
    const updateQuery = `
      UPDATE trails
      SET
        route_data = $1,
        distance_km = $2,
        elevation_gain_m = $3,
        estimated_time_hours = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(routeData),
      distance_km,
      elevation_gain_m,
      estimated_time_hours,
      id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Trail not found' },
        { status: 404 }
      );
    }

    const trailRow = result.rows[0];
    // Parse route_data for response
    if (trailRow.route_data && typeof trailRow.route_data === 'string') {
      try {
        trailRow.route_data = JSON.parse(trailRow.route_data);
      } catch (e) {
        // If parsing fails, keep as is
      }
    }

    return NextResponse.json(
      {
        trail: trailRow,
        message: 'Route uploaded successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading route:', error);
    return NextResponse.json(
      { error: 'Failed to upload route: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
