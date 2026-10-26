import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUBDOMAIN_HOME: Record<string, string> = {
  'services.locoxperts.com': '/services',
  'trails.locoxperts.com': '/trails',
};

export function proxy(request: NextRequest) {
  const destination = SUBDOMAIN_HOME[request.nextUrl.hostname.toLowerCase()];

  if (destination && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL(destination, request.url));
  }

  return NextResponse.next();
}
