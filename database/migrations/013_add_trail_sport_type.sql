ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS sport_type VARCHAR(50) DEFAULT 'mtb';

UPDATE trails
SET sport_type = 'mtb'
WHERE sport_type IS NULL;
