CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_trails_name_trgm
  ON trails USING GIN (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trails_location_trgm
  ON trails USING GIN (lower(location) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trails_description_trgm
  ON trails USING GIN (lower(COALESCE(description, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trails_difficulty_trgm
  ON trails USING GIN (lower(difficulty) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trails_sport_type_trgm
  ON trails USING GIN (lower(sport_type) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm
  ON organizations USING GIN (lower(name) gin_trgm_ops);
