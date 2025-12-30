-- Add route_data column to trails table to store route coordinates and elevation data
ALTER TABLE trails ADD COLUMN IF NOT EXISTS route_data JSONB;

-- Add index for route_data queries
CREATE INDEX IF NOT EXISTS idx_trails_route_data ON trails USING GIN (route_data);

