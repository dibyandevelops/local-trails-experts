CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (name, email, password_hash, role, bio, is_verified_expert)
VALUES (
  'csam mhz',
  'csam666666@gmail.com',
  crypt('admin2Password', gen_salt('bf')),
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

INSERT INTO users (name, email, password_hash, role, bio, is_verified_expert)
VALUES (
  'Vishal Shrestha',
  'vishalshrestha@gmail.com',
  crypt('admin3Password', gen_salt('bf')),
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
