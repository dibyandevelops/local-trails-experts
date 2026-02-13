const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const env = (key) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

const connectionString =
  env('DIRECT_DATABASE_URL') ||
  `postgresql://${env('DB_USER') || 'postgres'}:${env('DB_PASSWORD') || 'postgres'}@${env('DB_HOST') || 'localhost'}:${env('DB_PORT') || '5432'}/${env('DB_NAME') || 'mtb_trail_finder'}`;

async function smoke() {
  console.log(`connectionString`, connectionString)
  const pool = new Pool({
    connectionString,
    ssl:
      env('DB_SSL') === 'true' || env('DB_SSL') === '1'
        ? { rejectUnauthorized: false }
        : env('DIRECT_DATABASE_URL')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ DB connection OK:', result.rows[0].now);
  } catch (error) {
    console.error('❌ DB connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

smoke();
