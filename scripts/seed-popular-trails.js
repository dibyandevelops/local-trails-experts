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

const popularTrails = [
  // MTB
  { name: 'A-Line Flow Trail', description: 'Iconic jump-and-berm MTB trail with smooth flow and optional features.', difficulty: 'medium', location: 'Whistler, Canada', latitude: 50.1163, longitude: -122.9574, distance_km: 3.2, elevation_gain_m: 220, estimated_time_hours: 1.5, sport_type: 'mtb' },
  { name: 'Slickrock Loop', description: 'Classic grippy sandstone singletrack with punchy climbs and technical sections.', difficulty: 'hard', location: 'Moab, USA', latitude: 38.5733, longitude: -109.5198, distance_km: 17.5, elevation_gain_m: 390, estimated_time_hours: 3.8, sport_type: 'mtb' },
  { name: 'Bike Park Wales Blue Line', description: 'Beginner-friendly flow trail with wide turns and predictable terrain.', difficulty: 'easy', location: 'Merthyr Tydfil, UK', latitude: 51.7582, longitude: -3.3828, distance_km: 5.8, elevation_gain_m: 280, estimated_time_hours: 2.0, sport_type: 'mtb' },
  { name: 'Tokha Enduro Descent', description: 'Local favorite descent with roots, switchbacks, and scenic valley views.', difficulty: 'medium', location: 'Kathmandu, Nepal', latitude: 27.757, longitude: 85.321, distance_km: 7.6, elevation_gain_m: 460, estimated_time_hours: 2.7, sport_type: 'mtb' },
  { name: 'Phulchowki Ridge Ride', description: 'Long mountain ride with mixed surfaces and sustained elevation.', difficulty: 'hard', location: 'Lalitpur, Nepal', latitude: 27.5833, longitude: 85.35, distance_km: 22.3, elevation_gain_m: 1180, estimated_time_hours: 6.2, sport_type: 'mtb' },

  // Hiking
  { name: 'Everest View Trail', description: 'Panoramic Himalayan viewpoints with steady uphill hiking segments.', difficulty: 'medium', location: 'Namche, Nepal', latitude: 27.805, longitude: 86.714, distance_km: 8.2, elevation_gain_m: 540, estimated_time_hours: 4.0, sport_type: 'hiking' },
  { name: 'Annapurna Basecamp Access', description: 'Popular approach route with villages, forests, and alpine scenery.', difficulty: 'hard', location: 'Kaski, Nepal', latitude: 28.53, longitude: 83.87, distance_km: 14.1, elevation_gain_m: 960, estimated_time_hours: 6.5, sport_type: 'hiking' },
  { name: 'Shivapuri Nature Walk', description: 'Forest hike with birdlife and gentle gradients suitable for most hikers.', difficulty: 'easy', location: 'Kathmandu, Nepal', latitude: 27.8167, longitude: 85.3667, distance_km: 6.4, elevation_gain_m: 240, estimated_time_hours: 2.4, sport_type: 'hiking' },
  { name: 'Langtang Valley Day Trek', description: 'High-valley trekking trail with river crossings and open meadows.', difficulty: 'medium', location: 'Rasuwa, Nepal', latitude: 28.21, longitude: 85.56, distance_km: 11.7, elevation_gain_m: 610, estimated_time_hours: 5.2, sport_type: 'hiking' },
  { name: 'Poon Hill Sunrise Route', description: 'Widely known sunrise hike with stone stair sections and ridge views.', difficulty: 'medium', location: 'Myagdi, Nepal', latitude: 28.4, longitude: 83.69, distance_km: 9.3, elevation_gain_m: 690, estimated_time_hours: 4.7, sport_type: 'hiking' },

  // Trail Running
  { name: 'Kathmandu Valley Tempo Loop', description: 'Rolling terrain ideal for threshold pace trail sessions.', difficulty: 'medium', location: 'Kathmandu, Nepal', latitude: 27.712, longitude: 85.327, distance_km: 12.0, elevation_gain_m: 420, estimated_time_hours: 1.9, sport_type: 'trail_running' },
  { name: 'Nagarkot Ridge Run', description: 'Fast ridge run with panoramic views and moderate climbing.', difficulty: 'medium', location: 'Bhaktapur, Nepal', latitude: 27.717, longitude: 85.517, distance_km: 15.4, elevation_gain_m: 640, estimated_time_hours: 2.8, sport_type: 'trail_running' },
  { name: 'Godavari Forest Intervals', description: 'Short punchy trails suitable for hill repeats and interval sessions.', difficulty: 'easy', location: 'Lalitpur, Nepal', latitude: 27.6167, longitude: 85.3833, distance_km: 7.1, elevation_gain_m: 260, estimated_time_hours: 1.3, sport_type: 'trail_running' },
  { name: 'Shivapuri Summit Run', description: 'Challenging trail run to summit with technical descent sections.', difficulty: 'hard', location: 'Kathmandu, Nepal', latitude: 27.8167, longitude: 85.3667, distance_km: 18.6, elevation_gain_m: 980, estimated_time_hours: 3.9, sport_type: 'trail_running' },
  { name: 'Balthali Village Run', description: 'Mixed village and forest terrain for longer aerobic training.', difficulty: 'easy', location: 'Kavre, Nepal', latitude: 27.55, longitude: 85.61, distance_km: 10.3, elevation_gain_m: 300, estimated_time_hours: 1.8, sport_type: 'trail_running' },

  // Local Tour
  { name: 'Patan Heritage Ride', description: 'Cultural tour through courtyards, temples, and historic streets.', difficulty: 'easy', location: 'Lalitpur, Nepal', latitude: 27.673, longitude: 85.325, distance_km: 6.8, elevation_gain_m: 70, estimated_time_hours: 2.0, sport_type: 'local_tour' },
  { name: 'Bhaktapur Old Town Circuit', description: 'Slow-paced city loop focused on architecture and local food stops.', difficulty: 'easy', location: 'Bhaktapur, Nepal', latitude: 27.6711, longitude: 85.4294, distance_km: 5.1, elevation_gain_m: 55, estimated_time_hours: 1.7, sport_type: 'local_tour' },
  { name: 'Kathmandu Stupa Tour', description: 'Urban route connecting major stupas and neighborhood landmarks.', difficulty: 'easy', location: 'Kathmandu, Nepal', latitude: 27.719, longitude: 85.337, distance_km: 9.0, elevation_gain_m: 90, estimated_time_hours: 2.4, sport_type: 'local_tour' },
  { name: 'Kirtipur Cultural Loop', description: 'Traditional town loop with viewpoints and local heritage sites.', difficulty: 'easy', location: 'Kirtipur, Nepal', latitude: 27.678, longitude: 85.277, distance_km: 4.9, elevation_gain_m: 85, estimated_time_hours: 1.5, sport_type: 'local_tour' },
  { name: 'Bungamati Artisan Route', description: 'Village tour route highlighting woodcraft and local markets.', difficulty: 'easy', location: 'Lalitpur, Nepal', latitude: 27.631, longitude: 85.304, distance_km: 7.4, elevation_gain_m: 110, estimated_time_hours: 2.1, sport_type: 'local_tour' },

  // Road Cycling
  { name: 'Valley Ring Road Endurance', description: 'Long steady road loop for endurance base training.', difficulty: 'medium', location: 'Kathmandu Valley, Nepal', latitude: 27.7, longitude: 85.33, distance_km: 42.0, elevation_gain_m: 420, estimated_time_hours: 2.6, sport_type: 'road_cycling' },
  { name: 'Kathmandu to Nagarkot Climb', description: 'Popular sustained climb with scenic switchbacks and smooth tarmac.', difficulty: 'hard', location: 'Kathmandu-Bhaktapur, Nepal', latitude: 27.71, longitude: 85.47, distance_km: 33.5, elevation_gain_m: 1180, estimated_time_hours: 3.5, sport_type: 'road_cycling' },
  { name: 'Godavari Tempo Route', description: 'Mid-length road route suitable for tempo and sweet-spot blocks.', difficulty: 'medium', location: 'Lalitpur, Nepal', latitude: 27.617, longitude: 85.383, distance_km: 24.2, elevation_gain_m: 390, estimated_time_hours: 1.6, sport_type: 'road_cycling' },
  { name: 'Thankot Hill Repeats', description: 'Structured climbing route used for hill repeat sessions.', difficulty: 'hard', location: 'Kathmandu, Nepal', latitude: 27.694, longitude: 85.236, distance_km: 19.8, elevation_gain_m: 760, estimated_time_hours: 1.9, sport_type: 'road_cycling' },
  { name: 'Boudha Recovery Spin', description: 'Mostly flat urban route for recovery and easy aerobic rides.', difficulty: 'easy', location: 'Kathmandu, Nepal', latitude: 27.721, longitude: 85.362, distance_km: 14.5, elevation_gain_m: 140, estimated_time_hours: 1.1, sport_type: 'road_cycling' },

  // XC Trails
  { name: 'Shivapuri XC Circuit', description: 'Cross-country loop with punchy climbs and fast descents.', difficulty: 'medium', location: 'Kathmandu, Nepal', latitude: 27.813, longitude: 85.358, distance_km: 16.7, elevation_gain_m: 770, estimated_time_hours: 3.4, sport_type: 'xc_trails' },
  { name: 'Kakani Pine XC', description: 'Rolling XC trail through pine forest with technical corners.', difficulty: 'medium', location: 'Nuwakot, Nepal', latitude: 27.834, longitude: 85.252, distance_km: 13.9, elevation_gain_m: 630, estimated_time_hours: 2.9, sport_type: 'xc_trails' },
  { name: 'Chandragiri XC Challenge', description: 'Hard XC route combining sustained climbs and rocky traverses.', difficulty: 'hard', location: 'Kathmandu, Nepal', latitude: 27.667, longitude: 85.233, distance_km: 18.1, elevation_gain_m: 980, estimated_time_hours: 3.9, sport_type: 'xc_trails' },
  { name: 'Nagarkot XC Loop', description: 'Balanced XC route with forest doubletrack and singletrack.', difficulty: 'medium', location: 'Bhaktapur, Nepal', latitude: 27.717, longitude: 85.517, distance_km: 14.4, elevation_gain_m: 590, estimated_time_hours: 2.8, sport_type: 'xc_trails' },
  { name: 'Pharping XC Starter', description: 'Entry-level XC route with manageable gradients and flowy sections.', difficulty: 'easy', location: 'Kathmandu, Nepal', latitude: 27.616, longitude: 85.285, distance_km: 9.8, elevation_gain_m: 340, estimated_time_hours: 2.0, sport_type: 'xc_trails' },

  // Gravel Rides
  { name: 'Balthali Gravel Loop', description: 'Mixed-surface countryside route ideal for all-road bikes.', difficulty: 'medium', location: 'Kavre, Nepal', latitude: 27.55, longitude: 85.61, distance_km: 31.2, elevation_gain_m: 880, estimated_time_hours: 3.2, sport_type: 'gravel_rides' },
  { name: 'Kakani Gravel Escape', description: 'Gravel-heavy route with mountain views and long false flats.', difficulty: 'medium', location: 'Nuwakot, Nepal', latitude: 27.83, longitude: 85.25, distance_km: 38.5, elevation_gain_m: 1010, estimated_time_hours: 3.9, sport_type: 'gravel_rides' },
  { name: 'Pharping Farm Roads', description: 'Scenic farm-road gravel ride with rolling terrain.', difficulty: 'easy', location: 'Kathmandu, Nepal', latitude: 27.617, longitude: 85.283, distance_km: 22.7, elevation_gain_m: 430, estimated_time_hours: 2.3, sport_type: 'gravel_rides' },
  { name: 'Nagarkot Backroads', description: 'Highland gravel backroads with punchy ramps and viewpoints.', difficulty: 'hard', location: 'Bhaktapur, Nepal', latitude: 27.717, longitude: 85.517, distance_km: 40.4, elevation_gain_m: 1280, estimated_time_hours: 4.4, sport_type: 'gravel_rides' },
  { name: 'Godavari All-Road Circuit', description: 'Fast mixed-surface route good for endurance and cadence drills.', difficulty: 'easy', location: 'Lalitpur, Nepal', latitude: 27.617, longitude: 85.383, distance_km: 26.1, elevation_gain_m: 470, estimated_time_hours: 2.5, sport_type: 'gravel_rides' },
];

async function seedPopularTrails() {
  try {
    console.log(`Seeding ${popularTrails.length} popular trails...`);

    for (const trail of popularTrails) {
      const existing = await pool.query(
        'SELECT id FROM trails WHERE LOWER(name) = LOWER($1)',
        [trail.name]
      );

      if (existing.rows.length > 0) {
        console.log(`⊘ Skipped (already exists): ${trail.name}`);
        continue;
      }

      await pool.query(
        `
          INSERT INTO trails (
            name, description, difficulty, location, latitude, longitude,
            distance_km, elevation_gain_m, estimated_time_hours, sport_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          trail.name,
          trail.description,
          trail.difficulty,
          trail.location,
          trail.latitude,
          trail.longitude,
          trail.distance_km,
          trail.elevation_gain_m,
          trail.estimated_time_hours,
          trail.sport_type,
        ]
      );

      console.log(`✓ Added: ${trail.name} (${trail.sport_type})`);
    }

    const summary = await pool.query(`
      SELECT sport_type, COUNT(*) AS count
      FROM trails
      WHERE sport_type IN ('mtb','hiking','trail_running','local_tour','road_cycling','xc_trails','gravel_rides')
      GROUP BY sport_type
      ORDER BY sport_type
    `);

    console.log('\nCurrent trail counts by sport:');
    summary.rows.forEach((row) => {
      console.log(`  ${row.sport_type}: ${row.count}`);
    });
  } catch (error) {
    console.error('Error seeding popular trails:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedPopularTrails();
