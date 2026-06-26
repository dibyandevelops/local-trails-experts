ALTER TABLE ride_notes
  DROP CONSTRAINT IF EXISTS ride_notes_status_check;

ALTER TABLE ride_notes
  ADD CONSTRAINT ride_notes_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'rejected'));
