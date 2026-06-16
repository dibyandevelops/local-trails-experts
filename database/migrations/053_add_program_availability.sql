ALTER TABLE expert_ride_programs
  ADD COLUMN IF NOT EXISTS availability_weekdays JSONB,
  ADD COLUMN IF NOT EXISTS available_time_note VARCHAR(120);
