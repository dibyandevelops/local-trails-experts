ALTER TABLE expert_applications
  ADD COLUMN IF NOT EXISTS verification_years_experience TEXT,
  ADD COLUMN IF NOT EXISTS verification_certifications TEXT,
  ADD COLUMN IF NOT EXISTS verification_guiding_history TEXT,
  ADD COLUMN IF NOT EXISTS verification_safety_training TEXT,
  ADD COLUMN IF NOT EXISTS verification_links TEXT;
