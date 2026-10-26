-- Extend organization services to include small and medium business support.
ALTER TABLE organization_services DROP CONSTRAINT IF EXISTS organization_services_category_check;
ALTER TABLE organization_services ADD CONSTRAINT organization_services_category_check CHECK (
  category IN (
    'ride_photography', 'shuttle_transport', 'creative_design', 'guiding',
    'training', 'bike_rental', 'repair_support', 'event_support',
    'web_development', 'digital_marketing', 'sales_support', 'it_support',
    'maps_presence', 'other'
  )
);
