import { Pool } from 'pg';
import { getServerEnv } from '@/lib/env.server';

// Create a connection pool for PostgreSQL
const env = (key: keyof ReturnType<typeof getServerEnv>) => {
  const value = getServerEnv()[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
};

const pool = new Pool({
  connectionString:
    env('DATABASE_URL') ||
    `postgresql://${env('DB_USER') || 'postgres'}:${env('DB_PASSWORD') || 'postgres'}@${env('DB_HOST') || 'localhost'}:${env('DB_PORT') || '5432'}/${env('DB_NAME') || 'mtb_trail_finder'}`,
  ssl:
    env('DB_SSL') === 'true' || env('DB_SSL') === '1'
      ? { rejectUnauthorized: false }
      : env('DATABASE_URL')
      ? { rejectUnauthorized: false }
      : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
