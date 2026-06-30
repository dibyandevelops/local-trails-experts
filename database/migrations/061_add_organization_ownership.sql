ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('org_owner', 'org_admin', 'org_editor'));

WITH eligible_owners AS (
  SELECT
    o.id AS organization_id,
    o.created_by_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY o.created_by_user_id
      ORDER BY o.created_at ASC, o.id ASC
    ) AS ownership_rank
  FROM organizations o
  JOIN users u ON u.id = o.created_by_user_id
  WHERE o.owner_user_id IS NULL
    AND u.role = 'expert'
    AND u.is_verified_expert = TRUE
)
UPDATE organizations o
SET owner_user_id = eligible_owners.created_by_user_id
FROM eligible_owners
WHERE o.id = eligible_owners.organization_id
  AND eligible_owners.ownership_rank = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_owner_user
  ON organizations (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

INSERT INTO organization_members (organization_id, user_id, role, status)
SELECT id, owner_user_id, 'org_owner', 'active'
FROM organizations
WHERE owner_user_id IS NOT NULL
ON CONFLICT (organization_id, user_id)
DO UPDATE SET
  role = 'org_owner',
  status = 'active',
  updated_at = NOW();

UPDATE organization_members om
SET status = 'disabled', updated_at = NOW()
WHERE status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = om.user_id
      AND u.role = 'expert'
      AND u.is_verified_expert = TRUE
  );

CREATE OR REPLACE FUNCTION enforce_organization_expert_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = NEW.user_id
      AND role = 'expert'
      AND is_verified_expert = TRUE
  ) THEN
    RAISE EXCEPTION 'Organization members must be verified expert users';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_members_require_expert ON organization_members;
CREATE TRIGGER organization_members_require_expert
BEFORE INSERT OR UPDATE OF user_id ON organization_members
FOR EACH ROW EXECUTE FUNCTION enforce_organization_expert_member();
