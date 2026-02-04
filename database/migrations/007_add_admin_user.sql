CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (name, email, password_hash, role, bio, is_verified_expert)
VALUES (
  'Dibyan Admin',
  'dibyan.softwaredev@gmail.com',
  crypt('1MicroPassword', gen_salt('bf')),
  'admin',
  'Platform administrator.',
  FALSE
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  is_verified_expert = EXCLUDED.is_verified_expert,
  password_hash = EXCLUDED.password_hash;
