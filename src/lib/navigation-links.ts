export const NAVIGATOR_SCHEME = 'locoxperts';

export function getNavigatorDeepLink(trailIdentifier: string) {
  const identifier = String(trailIdentifier || '').trim();
  if (!identifier) return '';
  return `${NAVIGATOR_SCHEME}://navigate/${encodeURIComponent(identifier)}`;
}
