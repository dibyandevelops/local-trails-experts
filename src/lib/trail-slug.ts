type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ slug: string }> }>;
};

export function toTrailSlug(name: string) {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'trail';
}

export async function getUniqueTrailSlug(
  db: Queryable,
  name: string,
  excludeId?: string
) {
  const base = toTrailSlug(name);
  const existing = await db.query(
    `
    SELECT slug
    FROM trails
    WHERE slug = $1 OR slug LIKE $2
      ${excludeId ? 'AND id <> $3' : ''}
    `,
    excludeId ? [base, `${base}-%`, excludeId] : [base, `${base}-%`]
  );

  if (existing.rows.length === 0) return base;
  const taken = new Set(existing.rows.map((row) => row.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

