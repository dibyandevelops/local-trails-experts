ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS contact_value VARCHAR(160);

UPDATE marketplace_listings listing
SET contact_methods = ARRAY[
  CASE
    WHEN listing.contact_methods @> ARRAY['whatsapp']::TEXT[] THEN 'whatsapp'
    WHEN listing.contact_methods @> ARRAY['phone']::TEXT[] THEN 'phone'
    WHEN listing.contact_methods @> ARRAY['email']::TEXT[] THEN 'email'
    ELSE 'whatsapp'
  END
]
WHERE cardinality(listing.contact_methods) <> 1;

UPDATE marketplace_listings listing
SET contact_value = LEFT(
  CASE
    WHEN listing.contact_methods @> ARRAY['email']::TEXT[] THEN COALESCE(NULLIF(owner.email, ''), 'contact@example.com')
    ELSE COALESCE(NULLIF(owner.phone, ''), NULLIF(owner.email, ''), '9800000000')
  END,
  160
)
FROM users owner
WHERE owner.id = listing.owner_user_id
  AND (listing.contact_value IS NULL OR listing.contact_value = '');

UPDATE marketplace_listings
SET contact_value = '9800000000'
WHERE contact_value IS NULL OR contact_value = '';

ALTER TABLE marketplace_listings
  ALTER COLUMN contact_value SET NOT NULL;

ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_contact_methods_valid;

ALTER TABLE marketplace_listings
  ADD CONSTRAINT marketplace_contact_methods_valid CHECK (
    contact_methods <@ ARRAY['whatsapp', 'phone', 'email']::TEXT[]
    AND cardinality(contact_methods) = 1
  );
