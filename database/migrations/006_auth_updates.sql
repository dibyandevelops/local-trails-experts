ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE users
SET password_updated_at = COALESCE(password_updated_at, created_at)
WHERE password_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
