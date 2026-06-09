import { Pool } from 'pg';
import { getServerEnv } from '@/lib/env.server';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isReadOnlySql(sql: string) {
  const trimmed = sql.trim().toLowerCase();
  return (
    trimmed.startsWith('select') ||
    trimmed.startsWith('with') ||
    trimmed.startsWith('show') ||
    trimmed.startsWith('explain')
  );
}

function isRetryablePgError(error: unknown) {
  const err = error as any;
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : '';

  // Network/connection-level issues (Node).
  if (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === 'ENOTFOUND'
  ) {
    return true;
  }

  // Postgres transient/server issues.
  // 57P01: admin_shutdown, 57P02: crash_shutdown, 57P03: cannot_connect_now
  // 08006/08003: connection failure/not exist, 53300: too_many_connections
  if (['57P01', '57P02', '57P03', '08006', '08003', '53300'].includes(code)) {
    return true;
  }

  // Message-based fallbacks seen in serverless/Neon hiccups.
  if (
    /terminating connection/i.test(message) ||
    /connection terminated unexpectedly/i.test(message) ||
    /connection terminated due to connection timeout/i.test(message) ||
    /connection timeout/i.test(message) ||
    /timed out/i.test(message) ||
    /server closed the connection unexpectedly/i.test(message) ||
    /socket hang up/i.test(message)
  ) {
    return true;
  }

  return false;
}

// Create a connection pool for PostgreSQL
const env = (key: keyof ReturnType<typeof getServerEnv>) => {
  const value = getServerEnv()[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
};

const pool = new Pool({
  connectionString:
    env('DIRECT_DATABASE_URL') ||
    `postgresql://${env('DB_USER') || 'postgres'}:${env('DB_PASSWORD') || 'postgres'}@${env('DB_HOST') || 'localhost'}:${env('DB_PORT') || '5432'}/${env('DB_NAME') || 'mtb_trail_finder'}`,
  ssl:
    env('DB_SSL') === 'true' || env('DB_SSL') === '1'
      ? {
          rejectUnauthorized:
            env('DB_SSL_REJECT_UNAUTHORIZED') === 'false' ? false : true,
        }
      : env('DIRECT_DATABASE_URL')
      ? {
          rejectUnauthorized:
            env('DB_SSL_REJECT_UNAUTHORIZED') === 'false' ? false : true,
        }
      : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

// Best-effort retry for read-only queries (safe to repeat) when the DB hiccups.
const originalQuery: any = pool.query.bind(pool);
(pool as any).query = async (...args: any[]) => {
  const firstArg = args[0];
  const sql =
    typeof firstArg === 'string'
      ? firstArg
      : typeof firstArg?.text === 'string'
        ? firstArg.text
        : '';

  // Avoid retries for writes to prevent duplicate side-effects.
  const shouldRetry = sql ? isReadOnlySql(sql) : false;
  if (!shouldRetry) {
    return originalQuery(...args);
  }

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await originalQuery(...args);
    } catch (error) {
      if (attempt === maxAttempts || !isRetryablePgError(error)) {
        throw error;
      }
      const base = 120 * attempt;
      const jitter = Math.floor(Math.random() * 80);
      await sleep(base + jitter);
    }
  }
};

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't crash the process; serverless runtimes will restart on demand.
});

export default pool;
