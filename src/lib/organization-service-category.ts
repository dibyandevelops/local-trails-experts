export const ORGANIZATION_SERVICE_CATEGORY_VALUES = [
  'ride_photography',
  'shuttle_transport',
  'creative_design',
  'guiding',
  'training',
  'bike_rental',
  'repair_support',
  'event_support',
  'other',
] as const;

export type OrganizationServiceCategory =
  (typeof ORGANIZATION_SERVICE_CATEGORY_VALUES)[number];

export function inferOrganizationServiceCategory(input: string): OrganizationServiceCategory {
  const value = input.toLowerCase();
  if (/photo|photograph|camera|video|film|drone/.test(value)) return 'ride_photography';
  if (/shuttle|transport|pickup|drop[ -]?off|vehicle|transfer/.test(value)) return 'shuttle_transport';
  if (/design|poster|graphic|brand|logo|creative/.test(value)) return 'creative_design';
  if (/coach|training|clinic|lesson|skill|instruction/.test(value)) return 'training';
  if (/guide|guided|tour|route planning|local ride/.test(value)) return 'guiding';
  if (/rent|rental|hire|equipment|bike fleet/.test(value)) return 'bike_rental';
  if (/repair|mechanic|maintenance|service bike|puncture|workshop/.test(value)) return 'repair_support';
  if (/event|race|competition|marshal|timing/.test(value)) return 'event_support';
  return 'other';
}
