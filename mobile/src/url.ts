export function trailIdentifierFromUrl(url: string | null): string {
  if (!url) return '';
  try {
    // Handle custom schemes like locoxperts://navigate/trail-slug or https://domain.com/trails/slug
    const normalized = url.includes('://') ? url : `https://${url}`;
    const parsed = new URL(normalized);
    const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
    const parts = path.split('/').filter(Boolean);

    const decode = (val: string) => {
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    };

    if (parsed.hostname.toLowerCase() === 'navigate' && path) {
      return decode(path);
    }
    if (parts[0] === 'navigate' || parts[0] === 'trails') {
      return decode(parts.slice(1).join('/'));
    }
    return '';
  } catch {
    return '';
  }
}
