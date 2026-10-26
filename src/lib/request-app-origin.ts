import type { NextRequest } from 'next/server';

const PRIMARY_DOMAIN = 'locoxperts.com';

/**
 * Keep OAuth on the same trusted LocoXperts hostname that started the flow.
 * This lets its host-only state cookies remain available at the callback.
 */
export function getRequestAppOrigin(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isLocoXpertsHost =
    hostname === PRIMARY_DOMAIN || hostname.endsWith(`.${PRIMARY_DOMAIN}`);

  if (isLocoXpertsHost) return request.nextUrl.origin;

  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}
