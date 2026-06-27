ALTER TABLE expert_ride_programs
  ADD COLUMN IF NOT EXISTS program_type VARCHAR(30) NOT NULL DEFAULT 'guided_ride';

ALTER TABLE expert_ride_programs
  DROP CONSTRAINT IF EXISTS expert_ride_programs_program_type_check;

ALTER TABLE expert_ride_programs
  ADD CONSTRAINT expert_ride_programs_program_type_check
  CHECK (program_type IN ('guided_ride', 'training', 'skills_clinic', 'tour'));

CREATE INDEX IF NOT EXISTS idx_expert_ride_programs_program_type
  ON expert_ride_programs (program_type, is_active);
