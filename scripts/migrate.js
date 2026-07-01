const { withPool } = require('./db-utils');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = 'migrations';
const MAX_CONNECTION_ATTEMPTS = 4;

function isRetryableConnectionError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  const message = typeof error?.message === 'string' ? error.message : '';
  return (
    ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', '57P01', '57P02', '57P03', '08006', '08003', '53300'].includes(code) ||
    /control plane request failed/i.test(message) ||
    /connection (terminated|timeout|refused)/i.test(message) ||
    /server closed the connection/i.test(message) ||
    /socket hang up/i.test(message)
  );
}

async function withConnectionRetry(label, task) {
  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt === MAX_CONNECTION_ATTEMPTS || !isRetryableConnectionError(error)) throw error;
      const delayMs = 400 * attempt + Math.floor(Math.random() * 200);
      console.warn(`${label} failed due to a temporary database connection issue. Retrying (${attempt}/${MAX_CONNECTION_ATTEMPTS - 1})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function ensureMigrationsTable(pool) {
  await withConnectionRetry('Creating the migrations table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
  );
}

async function getAppliedMigrations(pool) {
  const res = await withConnectionRetry('Reading applied migrations', () =>
    pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE}`)
  );
  return new Set(res.rows.map((row) => row.filename));
}

async function recordMigration(client, filename) {
  await client.query(
    `INSERT INTO ${MIGRATIONS_TABLE}(filename) VALUES ($1) ON CONFLICT DO NOTHING`,
    [filename]
  );
}

async function applyMigration(pool, filename, migrationSQL) {
  const client = await withConnectionRetry(`Connecting for ${filename}`, () => pool.connect());
  try {
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await recordMigration(client, filename);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
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
      await applyMigration(pool, file, migrationSQL);
      console.log(`✓ Completed: ${file}`);
    }

    console.log('\nAll migrations completed successfully!');
  });
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
