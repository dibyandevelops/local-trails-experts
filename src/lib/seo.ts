const DEFAULT_PROD_URL = 'https://locoxperts.com';

export const SITE_NAME = 'LocoXperts';
export const DEFAULT_TITLE = `${SITE_NAME} — MTB Trails Nepal, Local Experts & Rides`;
export const DEFAULT_DESCRIPTION =
  'Find mountain bike trails in Nepal, discover route guides, connect with local experts, and join outdoor rides and events.';

export function getPublicAppUrl() {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel = (process.env.VERCEL_URL || '').trim();
  if (vercel) return `https://${vercel}`.replace(/\/+$/, '');

  return DEFAULT_PROD_URL;
}

export function absoluteUrl(pathname: string) {
  const base = getPublicAppUrl();
  if (!pathname) return base;
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) return pathname;
  const slashPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${slashPath}`;
}
