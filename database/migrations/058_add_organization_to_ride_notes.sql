ALTER TABLE ride_notes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ride_notes_organization
  ON ride_notes(organization_id);
