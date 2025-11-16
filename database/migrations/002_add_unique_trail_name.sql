-- Add unique constraint on trail name (case-insensitive)
-- This prevents duplicate trail entries

-- First, create a unique index on lowercased trail names
CREATE UNIQUE INDEX IF NOT EXISTS idx_trails_name_unique
ON trails (LOWER(name));

