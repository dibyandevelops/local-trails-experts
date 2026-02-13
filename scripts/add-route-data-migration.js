const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'mtb_trail_finder'}`,
});

async function migrate() {
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/004_marketplace_core.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running route_data migration...');
    await pool.query(migrationSQL);
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();






