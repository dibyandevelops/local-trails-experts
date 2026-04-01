ALTER TABLE users
ADD COLUMN IF NOT EXISTS facebook_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_sub
ON users(facebook_sub)
WHERE facebook_sub IS NOT NULL;
