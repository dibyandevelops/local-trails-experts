ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

ALTER TABLE expert_applications
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
