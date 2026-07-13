const { runSeedScript, withPool } = require('./db-utils');

const NOTE = {
  slug: 'how-to-prepare-for-kora-2026',
  title: 'How to prepare for Kora 2026',
  excerpt:
    'A practical ride note for building fitness, checking your bike, choosing practice trails, and preparing your ride-day kit before Kora 2026.',
  category: 'ride_note',
  cover_image_url:
    'https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=1800&q=80',
  content: `Kora preparation is less about one difficult ride and more about building a reliable routine. Use the weeks before the event to understand your target, make your bike dependable, and practice the habits that will keep the ride comfortable.

1. Understand your ride target

Start with the Kora category and distance you are considering. Your practice rides should build towards that target gradually, rather than attempting the full distance without preparation.

2. Build steady fitness

Mix comfortable rides with one longer ride each week. Include climbing when possible, keep the pace sustainable, and leave enough recovery time between harder sessions.

3. Check the bike early

Inspect the brakes, drivetrain, tires, wheels, suspension, and contact points before your longer practice rides. Small issues are easier and cheaper to solve before event week.

4. Practice the route conditions

Choose local trails that reflect the climbing, surface, traffic, and weather you may encounter. If a route is unfamiliar, ask a local rider or guide for context before setting out.

5. Prepare your ride system

Test your hydration, nutrition, lights, repair kit, phone, navigation, and clothing during practice. The event is not the right time to discover that a setup does not work for you.

A simple ride-day kit

- Helmet and suitable riding clothing
- Water and simple ride nutrition
- Spare tube or tubeless repair supplies
- Pump or CO2 inflator and a multi-tool
- Charged phone, navigation, and power bank
- Front and rear lights if the ride may run late
- Emergency contact and a basic personal plan

Before you commit, check the official Kora information for the current route, category, dates, and registration requirements. Find a practice trail that matches your current level, or ask a local rider for route context when a trail is unfamiliar. A realistic plan and a steady start are more useful than trying to do everything in one weekend.

Official Kora information: https://mykorachallenge.com/`,
};

async function ensureNote(pool) {
  const table = await pool.query(`SELECT to_regclass('public.ride_notes') AS table_name`);
  if (!table.rows[0]?.table_name) {
    throw new Error('ride_notes table does not exist. Run the database migrations first.');
  }

  const result = await pool.query(
    `
    INSERT INTO ride_notes (
      slug,
      title,
      excerpt,
      content,
      cover_image_url,
      category,
      status,
      published_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      excerpt = EXCLUDED.excerpt,
      content = EXCLUDED.content,
      cover_image_url = EXCLUDED.cover_image_url,
      category = EXCLUDED.category,
      status = 'published',
      published_at = COALESCE(ride_notes.published_at, NOW()),
      updated_at = NOW()
    RETURNING id, slug, status
    `,
    [
      NOTE.slug,
      NOTE.title,
      NOTE.excerpt,
      NOTE.content,
      NOTE.cover_image_url,
      NOTE.category,
    ]
  );

  return result.rows[0];
}

runSeedScript(
  () => withPool(async (pool) => {
    const note = await ensureNote(pool);
    console.log(`Kora ride note ready: ${note.slug} (${note.status})`);
  }),
  'Kora ride note'
);
