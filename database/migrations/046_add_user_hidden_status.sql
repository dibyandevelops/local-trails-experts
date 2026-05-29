-- Allows admins to hide expert profiles from public expert listings/pages.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_role_is_hidden
  ON users(role, is_hidden);
