import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'client-error', 20, 60);
    if (limited) return limited;

    const body = await request.json();
    const message =
      typeof body?.message === 'string' ? body.message.slice(0, 400) : 'Unknown client error';
    const stack = typeof body?.stack === 'string' ? body.stack.slice(0, 2500) : null;
    const source = typeof body?.source === 'string' ? body.source.slice(0, 120) : 'unknown';
    const page = typeof body?.page === 'string' ? body.page.slice(0, 300) : 'unknown';
    const userAgent =
      typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 400) : 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    console.error('Client exception reported', {
      message,
      stack,
      source,
      page,
      userAgent,
      ip,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error('Failed to process client error report', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
