ALTER TABLE trails
ADD COLUMN IF NOT EXISTS slug TEXT;

WITH base AS (
  SELECT
    id,
    trim(both '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS base_slug
  FROM trails
),
ranked AS (
  SELECT
    id,
    CASE
      WHEN base_slug = '' THEN 'trail'
      ELSE base_slug
    END AS safe_base_slug,
    row_number() OVER (
      PARTITION BY CASE WHEN base_slug = '' THEN 'trail' ELSE base_slug END
      ORDER BY created_at, id
    ) AS rn
  FROM base
  JOIN trails t USING (id)
)
UPDATE trails t
SET slug = CASE
  WHEN ranked.rn = 1 THEN ranked.safe_base_slug
  ELSE ranked.safe_base_slug || '-' || ranked.rn::text
END
FROM ranked
WHERE ranked.id = t.id
  AND (t.slug IS NULL OR t.slug = '');

ALTER TABLE trails
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trails_slug_unique_idx
ON trails(slug);

