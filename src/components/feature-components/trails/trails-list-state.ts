const TRAILS_SCROLL_KEY = 'trails_scroll_y';
const TRAILS_LAST_URL_KEY = 'trails_last_url';

export function storeTrailsListState() {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(
    TRAILS_LAST_URL_KEY,
    `${window.location.pathname}${window.location.search}`
  );
  sessionStorage.setItem(TRAILS_SCROLL_KEY, String(window.scrollY || 0));
}

export function readTrailsScrollPosition() {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(TRAILS_SCROLL_KEY);
  if (!raw) return null;

  const y = Number(raw);
  return Number.isFinite(y) ? y : null;
}

export function clearTrailsScrollPosition() {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem(TRAILS_SCROLL_KEY);
}
