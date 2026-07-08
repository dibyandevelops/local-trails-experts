import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import {
  getAdminMarketplaceData,
  MarketplaceDataError,
  reviewMarketplaceReport,
  setMarketplaceListingStatus,
} from '@/lib/data/marketplace-listings';
import type { MarketplaceListingStatus, MarketplaceReportStatus } from '@/lib/marketplace';

function requireAdmin(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  return auth?.role === 'admin' ? auth : null;
}

export async function GET(request: NextRequest) {
  try {
    if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await getAdminMarketplaceData(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching marketplace moderation data:', error);
    return NextResponse.json({ error: 'Failed to fetch marketplace moderation data.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    if (body?.target === 'report') {
      const status = body.status as MarketplaceReportStatus;
      if (!['reviewed', 'dismissed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid report status.' }, { status: 400 });
      }
      await reviewMarketplaceReport(String(body.id || ''), auth.sub, status);
    } else if (body?.target === 'listing') {
      const status = body.status as MarketplaceListingStatus;
      if (!['active', 'hidden', 'sold', 'deleted'].includes(status)) {
        return NextResponse.json({ error: 'Invalid listing status.' }, { status: 400 });
      }
      await setMarketplaceListingStatus(String(body.id || ''), auth, status);
    } else {
      return NextResponse.json({ error: 'Invalid moderation target.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MarketplaceDataError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'limit_reached' ? 409 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error moderating marketplace:', error);
    return NextResponse.json({ error: 'Failed to update marketplace moderation.' }, { status: 500 });
  }
}
