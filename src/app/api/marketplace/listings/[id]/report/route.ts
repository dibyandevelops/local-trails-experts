import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { MarketplaceDataError, reportMarketplaceListing } from '@/lib/data/marketplace-listings';
import { marketplaceReportReasons, type MarketplaceReportReason } from '@/lib/marketplace';
import { rateLimit } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const limited = await rateLimit(request, 'marketplace-report', 8, 60);
    if (limited) return limited;
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Login is required to report a listing.' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const reason = String(body?.reason || '') as MarketplaceReportReason;
    const details = String(body?.details || '').trim();
    if (!marketplaceReportReasons.includes(reason)) {
      return NextResponse.json({ error: 'Choose a valid report reason.' }, { status: 400 });
    }
    if (details.length > 500) {
      return NextResponse.json({ error: 'Report details must be 500 characters or less.' }, { status: 400 });
    }
    await reportMarketplaceListing(id, auth.sub, reason, details || null);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketplaceDataError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'duplicate_report' ? 409 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error reporting marketplace listing:', error);
    return NextResponse.json({ error: 'Failed to report marketplace listing.' }, { status: 500 });
  }
}
