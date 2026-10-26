export const SERVICE_CATEGORIES = [
  ['ride_photography', 'Ride photography'],
  ['shuttle_transport', 'Shuttle and transport'],
  ['creative_design', 'Graphics and design'],
  ['guiding', 'Guiding'],
  ['training', 'Training'],
  ['bike_rental', 'Bike rental'],
  ['repair_support', 'Repair support'],
  ['event_support', 'Event support'],
  ['web_development', 'Website design and development'],
  ['digital_marketing', 'Digital marketing and SEO'],
  ['sales_support', 'Sales and customer systems'],
  ['it_support', 'IT support and consulting'],
  ['maps_presence', 'Google Maps and local listings'],
  ['other', 'Other'],
] as const;

export function getServiceCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find(([value]) => value === category)?.[1] || 'Service';
}
