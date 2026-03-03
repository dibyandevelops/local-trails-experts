-- Enforce unique phone numbers across all users.
-- We keep NULL/empty values allowed, but any real phone must be unique.

UPDATE users
SET phone = NULL
WHERE phone IS NOT NULL AND btrim(phone) = '';

-- Normalize existing values so trivial whitespace differences don't bypass uniqueness.
UPDATE users
SET phone = btrim(phone)
WHERE phone IS NOT NULL;

-- Auto-resolve existing duplicates by keeping the most recently updated/created user
-- and nulling phone on older duplicates.
WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM users
  WHERE phone IS NOT NULL
),
to_clear AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE users u
SET phone = NULL,
    phone_verified_at = NULL
FROM to_clear c
WHERE u.id = c.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone_unique
  ON users (phone)
  WHERE phone IS NOT NULL;
