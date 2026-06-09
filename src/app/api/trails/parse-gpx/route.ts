import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { parseGPX } from '@/lib/gpx-parser';
import { rateLimit } from '@/lib/rate-limit';

const MAX_GPX_BYTES = 2 * 1024 * 1024;

function estimateTimeHours(distanceKm: number, elevationGainM: number) {
  const baseHours = distanceKm / 10;
  const climbHours = elevationGainM / 600;
  const estimate = baseHours + climbHours;
  return Number.isFinite(estimate) ? Number(estimate.toFixed(2)) : 0;
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'parse-gpx', 10, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_GPX_BYTES * 2) {
      return NextResponse.json(
        { error: 'Upload is too large. Please use a smaller GPX file.' },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('gpx_file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'GPX file is required.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      return NextResponse.json(
        { error: 'Only GPX files are supported.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_GPX_BYTES) {
      return NextResponse.json(
        { error: 'GPX file is too large. Please keep it under 2 MB.' },
        { status: 413 }
      );
    }

    const gpxText = await file.text();
    if (gpxText.length > MAX_GPX_BYTES) {
      return NextResponse.json(
        { error: 'GPX file is too large. Please keep it under 2 MB.' },
        { status: 413 }
      );
    }

    const routeData = await parseGPX(gpxText);
    const distance_km = Number(routeData.totalDistance.toFixed(2));
    const elevation_gain_m = Math.round(routeData.elevationGain);
    const estimated_time_hours = estimateTimeHours(distance_km, elevation_gain_m);
    const midpointIndex = Math.floor(routeData.coordinates.length / 2);
    const midpoint = routeData.coordinates[midpointIndex] ?? null;
    const lastPoint = routeData.coordinates[routeData.coordinates.length - 1];

    return NextResponse.json(
      {
        distance_km,
        elevation_gain_m,
        estimated_time_hours,
        mid_latitude: midpoint?.latitude ?? null,
        mid_longitude: midpoint?.longitude ?? null,
        last_latitude: lastPoint?.latitude ?? null,
        last_longitude: lastPoint?.longitude ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error parsing GPX:', error);
    return NextResponse.json({ error: 'Failed to parse GPX file' }, { status: 500 });
  }
}
