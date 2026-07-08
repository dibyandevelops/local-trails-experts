import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import {
  createMarketplaceListing,
  getMarketplacePageData,
  MarketplaceDataError,
} from '@/lib/data/marketplace-listings';
import { isAllowedImageUrl } from '@/lib/image-url';
import {
  MARKETPLACE_IMAGE_MAX_LENGTH,
  validateMarketplaceListingInput,
} from '@/lib/marketplace';
import { rateLimit } from '@/lib/rate-limit';

function dataErrorResponse(error: MarketplaceDataError) {
  const status = error.code === 'not_found' ? 404 : error.code === 'limit_reached' ? 409 : 403;
  return NextResponse.json({ error: error.message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const data = await getMarketplacePageData(auth?.sub);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': auth ? 'no-store' : 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json({ error: 'Failed to fetch marketplace listings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'marketplace-create', 8, 60);
    if (limited) return limited;
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Login is required to create a listing.' }, { status: 401 });

    const parsed = validateMarketplaceListingInput(await request.json());
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (parsed.data.images.some((image) => !isAllowedImageUrl(image, MARKETPLACE_IMAGE_MAX_LENGTH))) {
      return NextResponse.json({ error: 'Each photo must be a supported image under the size limit.' }, { status: 400 });
    }

    const listingId = await createMarketplaceListing(auth.sub, parsed.data);
    return NextResponse.json({ success: true, listingId }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketplaceDataError) return dataErrorResponse(error);
    console.error('Error creating marketplace listing:', error);
    return NextResponse.json({ error: 'Failed to create marketplace listing.' }, { status: 500 });
  }
}
