-- Add is_hidden column to trails table for admin hide functionality
ALTER TABLE trails
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_trails_is_hidden ON trails(is_hidden);

