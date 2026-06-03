const { withPool } = require('./db-utils');

async function smoke() {
  return withPool(async (pool) => {
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ DB connection OK:', result.rows[0].now);
  });
}

smoke().catch((error) => {
  console.error('❌ DB connection failed:', error.message);
  process.exitCode = 1;
});
