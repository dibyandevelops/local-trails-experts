import { NextRequest, NextResponse } from 'next/server';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

function parseCoordinate(value: string | null, min: number, max: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
    ? coordinate
    : null;
}

export async function GET(request: NextRequest) {
  const latitude = parseCoordinate(request.nextUrl.searchParams.get('latitude'), -90, 90);
  const longitude = parseCoordinate(request.nextUrl.searchParams.get('longitude'), -180, 180);

  if (latitude === null || longitude === null) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),
    forecast_days: '5',
    timezone: 'auto',
  });

  try {
    const response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, {
      next: { revalidate: 1800 },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.reason || 'Weather service unavailable.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      latitude,
      longitude,
      timezone: data.timezone || null,
      daily: data.daily || null,
      source: 'open-meteo',
    });
  } catch {
    return NextResponse.json({ error: 'Weather service unavailable.' }, { status: 502 });
  }
}
