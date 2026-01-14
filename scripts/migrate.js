const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = 'migrations';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'mtb_trail_finder'}`,
});

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const res = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE}`);
  return new Set(res.rows.map(row => row.filename));
}

async function recordMigration(filename) {
  await pool.query(
    `INSERT INTO ${MIGRATIONS_TABLE}(filename) VALUES ($1) ON CONFLICT DO NOTHING`,
    [filename]
  );
}

async function migrate() {
  try {
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();

    const filesToApply = files.filter(file => !applied.has(file));

    if (filesToApply.length === 0) {
      console.log('All migrations already applied. Nothing to do!');
      return;
    }

    console.log(`Found ${filesToApply.length} new migration(s) to run...`);

    for (const file of filesToApply) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log(`Running migration: ${file}...`);
      await pool.query(migrationSQL);
      await recordMigration(file);
      console.log(`✓ Completed: ${file}`);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
