ALTER TABLE users
  ADD COLUMN IF NOT EXISTS expert_gallery_photos TEXT[] DEFAULT '{}';

