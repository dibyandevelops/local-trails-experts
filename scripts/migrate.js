const { withPool } = require('./db-utils');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = 'migrations';

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(pool) {
  const res = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE}`);
  return new Set(res.rows.map((row) => row.filename));
}

async function recordMigration(pool, filename) {
  await pool.query(
    `INSERT INTO ${MIGRATIONS_TABLE}(filename) VALUES ($1) ON CONFLICT DO NOTHING`,
    [filename]
  );
}

async function migrate() {
  return withPool(async (pool) => {
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);

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
      await recordMigration(pool, file);
      console.log(`✓ Completed: ${file}`);
    }

    console.log('\nAll migrations completed successfully!');
  });
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
