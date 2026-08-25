import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'geo-nominatim-reverse', 30, 60);
  if (limited) return limited;

  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (!lat || !lon) {
      return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '16');

    const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'contact@locoxperts.com';
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': `LocoXperts/1.0 (${contactEmail})`,
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to reverse geocode location' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ result: data }, { status: 200 });
  } catch (error) {
    console.error('Nominatim reverse error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode location' },
      { status: 500 }
    );
  }
}
