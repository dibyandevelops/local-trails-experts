const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mtb_trail_finder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function removeDuplicates() {
  try {
    console.log('Checking for duplicate trails...');

    // Find duplicates based on name (case-insensitive)
    const duplicateQuery = `
      SELECT
        LOWER(name) as lower_name,
        COUNT(*) as count,
        array_agg(id ORDER BY created_at) as ids
      FROM trails
      GROUP BY LOWER(name)
      HAVING COUNT(*) > 1
    `;

    const duplicateResult = await pool.query(duplicateQuery);

    if (duplicateResult.rows.length === 0) {
      console.log('No duplicate trails found!');
      await pool.end();
      return;
    }

    console.log(`Found ${duplicateResult.rows.length} sets of duplicate trails.`);

    let totalRemoved = 0;

    for (const row of duplicateResult.rows) {
      const ids = row.ids;
      const keepId = ids[0]; // Keep the first (oldest) one
      const removeIds = ids.slice(1); // Remove the rest

      console.log(`\nTrail: "${row.lower_name}"`);
      console.log(`  Keeping: ${keepId} (oldest)`);
      console.log(`  Removing: ${removeIds.join(', ')}`);

      // Check if any of the trails to be removed are referenced in events
      const eventCheck = await pool.query(
        'SELECT COUNT(*) FROM events WHERE trail_id = ANY($1)',
        [removeIds]
      );

      if (parseInt(eventCheck.rows[0].count) > 0) {
        console.log(`  ⚠️  Warning: Some of these trails are referenced in events.`);
        console.log(`  Updating events to point to the kept trail...`);

        // Update events to point to the kept trail
        await pool.query(
          'UPDATE events SET trail_id = $1 WHERE trail_id = ANY($2)',
          [keepId, removeIds]
        );
      }

      // Delete duplicate trails
      const deleteResult = await pool.query(
        'DELETE FROM trails WHERE id = ANY($1)',
        [removeIds]
      );

      totalRemoved += deleteResult.rowCount;
      console.log(`  ✓ Removed ${deleteResult.rowCount} duplicate(s)`);
    }

    console.log(`\n✓ Successfully removed ${totalRemoved} duplicate trail(s)!`);

    // Show final count
    const finalCount = await pool.query('SELECT COUNT(*) FROM trails');
    console.log(`\nTotal trails remaining: ${finalCount.rows[0].count}`);

    // Show summary by difficulty
    const summary = await pool.query(`
      SELECT difficulty, COUNT(*) as count
      FROM trails
      GROUP BY difficulty
      ORDER BY difficulty
    `);

    console.log('\nTrail Summary:');
    summary.rows.forEach((row) => {
      console.log(`  ${row.difficulty}: ${row.count} trails`);
    });

  } catch (error) {
    console.error('Error removing duplicates:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

removeDuplicates();

