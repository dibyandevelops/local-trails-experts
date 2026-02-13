const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = 'migrations';

const env = (key) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

const connectionString =
  env('DIRECT_DATABASE_URL') ||
  `postgresql://${env('DB_USER') || 'postgres'}:${env('DB_PASSWORD') || 'postgres'}@${env('DB_HOST') || 'localhost'}:${env('DB_PORT') || '5432'}/${env('DB_NAME') || 'mtb_trail_finder'}`;

const pool = new Pool({
  connectionString,
  ssl:
    env('DB_SSL') === 'true' || env('DB_SSL') === '1'
      ? { rejectUnauthorized: false }
      : env('DIRECT_DATABASE_URL')
      ? { rejectUnauthorized: false }
      : undefined,
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
