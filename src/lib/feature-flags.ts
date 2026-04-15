export const STRAVA_ENABLED = false;

function parseBooleanFlag(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export const EXPERTS_BETA_ENABLED = parseBooleanFlag(
  process.env.NEXT_PUBLIC_EXPERTS_BETA_ENABLED,
  false
);

export const ESEWA_ENABLED = parseBooleanFlag(
  process.env.NEXT_PUBLIC_ESEWA_ENABLED,
  false
);
