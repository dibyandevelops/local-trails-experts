const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const env = (key) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

function createPool() {
  const connectionString =
    env('DIRECT_DATABASE_URL') ||
    `postgresql://${env('DB_USER') || 'postgres'}:${env('DB_PASSWORD') || 'postgres'}@${env('DB_HOST') || 'localhost'}:${env('DB_PORT') || '5432'}/${env('DB_NAME') || 'mtb_trail_finder'}`;

  return new Pool({
    connectionString,
    ssl:
      env('DB_SSL') === 'true' || env('DB_SSL') === '1'
        ? { rejectUnauthorized: false }
        : env('DIRECT_DATABASE_URL')
          ? { rejectUnauthorized: false }
          : undefined,
  });
}

async function withPool(task) {
  const pool = createPool();
  try {
    return await task(pool);
  } finally {
    await pool.end();
  }
}

function runSeedScript(task, label) {
  task().catch((error) => {
    console.error(`Error seeding ${label}:`, error);
    process.exit(1);
  });
}

module.exports = {
  createPool,
  runSeedScript,
  withPool,
};
