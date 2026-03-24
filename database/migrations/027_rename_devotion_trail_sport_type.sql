-- Rename sport code devotion_trail -> devotion_trail_rides
-- This keeps existing data compatible after the frontend/type rename.

UPDATE trails
SET sport_type = 'devotion_trail_rides'
WHERE sport_type = 'devotion_trail';

UPDATE events
SET sport_type = 'devotion_trail_rides'
WHERE sport_type = 'devotion_trail';

UPDATE users
SET sports = (
  SELECT jsonb_agg(to_jsonb(
    CASE
      WHEN value = 'devotion_trail' THEN 'devotion_trail_rides'
      ELSE value
    END
  ))
  FROM jsonb_array_elements_text(users.sports) AS t(value)
)
WHERE users.sports @> '["devotion_trail"]'::jsonb;

UPDATE expert_applications
SET sports = (
  SELECT jsonb_agg(to_jsonb(
    CASE
      WHEN value = 'devotion_trail' THEN 'devotion_trail_rides'
      ELSE value
    END
  ))
  FROM jsonb_array_elements_text(expert_applications.sports) AS t(value)
)
WHERE expert_applications.sports @> '["devotion_trail"]'::jsonb;

