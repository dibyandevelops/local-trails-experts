import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'geo-nominatim', 30, 60);
  if (limited) return limited;

  try {
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'np');

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
        { error: 'Failed to fetch location suggestions' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ results: data }, { status: 200 });
  } catch (error) {
    console.error('Nominatim error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location suggestions' },
      { status: 500 }
    );
  }
}
