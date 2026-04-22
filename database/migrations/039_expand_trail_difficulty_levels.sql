DO $$
DECLARE
  record_item RECORD;
BEGIN
  FOR record_item IN
    SELECT
      c.conname,
      cls.relname AS table_name
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    WHERE c.contype = 'c'
      AND cls.relname IN ('trails', 'events')
      AND pg_get_constraintdef(c.oid) ILIKE '%difficulty%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      record_item.table_name,
      record_item.conname
    );
  END LOOP;
END
$$;

UPDATE trails
SET difficulty = 'moderate'
WHERE difficulty = 'medium';

UPDATE events
SET difficulty = 'moderate'
WHERE difficulty = 'medium';

ALTER TABLE trails
ADD CONSTRAINT trails_difficulty_check
CHECK (difficulty IN ('novice', 'easy', 'moderate', 'hard', 'expert'));

ALTER TABLE events
ADD CONSTRAINT events_difficulty_check
CHECK (difficulty IN ('novice', 'easy', 'moderate', 'hard', 'expert'));

