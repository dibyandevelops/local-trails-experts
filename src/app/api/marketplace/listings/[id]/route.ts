import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import {
  deleteMarketplaceListing,
  MarketplaceDataError,
  setMarketplaceListingStatus,
  updateMarketplaceListing,
} from '@/lib/data/marketplace-listings';
import { isAllowedImageUrl } from '@/lib/image-url';
import {
  MARKETPLACE_IMAGE_MAX_LENGTH,
  type MarketplaceListingStatus,
  validateMarketplaceListingInput,
} from '@/lib/marketplace';
import { rateLimit } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

function dataErrorResponse(error: MarketplaceDataError) {
  const status = error.code === 'not_found' ? 404 : error.code === 'limit_reached' ? 409 : 403;
  return NextResponse.json({ error: error.message }, { status });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const limited = await rateLimit(request, 'marketplace-update', 20, 60);
    if (limited) return limited;
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    if (body?.action === 'set_status') {
      const allowedStatuses: MarketplaceListingStatus[] = ['active', 'hidden', 'sold'];
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid listing status.' }, { status: 400 });
      }
      await setMarketplaceListingStatus(id, auth, body.status);
    } else {
      const parsed = validateMarketplaceListingInput(body);
      if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (parsed.data.images.some((image) => !isAllowedImageUrl(image, MARKETPLACE_IMAGE_MAX_LENGTH))) {
        return NextResponse.json({ error: 'Each photo must be a supported image under the size limit.' }, { status: 400 });
      }
      await updateMarketplaceListing(id, auth, parsed.data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MarketplaceDataError) return dataErrorResponse(error);
    console.error('Error updating marketplace listing:', error);
    return NextResponse.json({ error: 'Failed to update marketplace listing.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const limited = await rateLimit(request, 'marketplace-delete', 10, 60);
    if (limited) return limited;
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await deleteMarketplaceListing(id, auth);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MarketplaceDataError) return dataErrorResponse(error);
    console.error('Error deleting marketplace listing:', error);
    return NextResponse.json({ error: 'Failed to delete marketplace listing.' }, { status: 500 });
  }
}
