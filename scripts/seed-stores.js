const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

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

const stores = [
  {
    name: 'The Bike Farm Nepal',
    city: 'Lalitpur',
    location: 'Jamsikhel, Lalitpur ( Santa Bhawan Marg )',
    latitude: 27.680089442074625,
    longitude: 85.30663233466686,
    services: 'Bicycle Store and maintenance hub ( Official distributor of Polygon Bikes)',
    hours: 'Open 10:00–18:00',
    phone: '+977 9702615667',
    website: 'https://bikefarmnepal.com',
  },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM stores');
    for (const store of stores) {
      await client.query(
        `
        INSERT INTO stores (name, city, location, latitude, longitude, services, hours, phone, website, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
        ON CONFLICT DO NOTHING
        `,
        [
          store.name,
          store.city,
          store.location,
          store.latitude,
          store.longitude,
          store.services || null,
          store.hours || null,
          store.phone || null,
          store.website || null,
        ]
      );
    }
    console.log('Stores seeded successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Failed to seed stores:', err);
  process.exit(1);
});
