export const TRAIL_SAFETY_OPTIONS = [
  { value: 'helmet_required', label: 'Helmet Required' },
  { value: 'carry_water', label: 'Carry Water' },
  { value: 'technical_section', label: 'Technical Section' },
  { value: 'steep_descent', label: 'Steep Descent' },
  { value: 'wildlife_area', label: 'Wildlife Area' },
  { value: 'weather_exposed', label: 'Weather Exposed' },
] as const;

export type TrailSafetyLabel = (typeof TRAIL_SAFETY_OPTIONS)[number]['value'];

const safetyLabelSet = new Set<string>(TRAIL_SAFETY_OPTIONS.map((item) => item.value));
const safetyLabelMap = new Map<string, string>(
  TRAIL_SAFETY_OPTIONS.map((item) => [item.value, item.label])
);

export function normalizeSafetyLabels(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .filter((value) => safetyLabelSet.has(value));
}

export function getSafetyLabelText(code: string) {
  return safetyLabelMap.get(code) || code.replace(/_/g, ' ');
}
