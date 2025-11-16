const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mtb_trail_finder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const trails = [
  // Easy Trails (15 trails)
  {
    name: 'Shivapuri Nagarjun National Park Trail',
    description: 'A gentle trail through the national park with beautiful forest views and easy terrain perfect for beginners.',
    difficulty: 'easy',
    location: 'Shivapuri, Kathmandu',
    latitude: 27.8167,
    longitude: 85.3667,
    distance_km: 5.2,
    elevation_gain_m: 200,
    estimated_time_hours: 2.0,
  },
  {
    name: 'Budhanilkantha Temple Loop',
    description: 'A scenic loop trail around the famous Budhanilkantha temple area with smooth paths.',
    difficulty: 'easy',
    location: 'Budhanilkantha, Kathmandu',
    latitude: 27.7833,
    longitude: 85.3667,
    distance_km: 4.5,
    elevation_gain_m: 150,
    estimated_time_hours: 1.5,
  },
  {
    name: 'Taudaha Lake Circuit',
    description: 'A flat, easy ride around the beautiful Taudaha Lake with minimal elevation gain.',
    difficulty: 'easy',
    location: 'Taudaha, Kathmandu',
    latitude: 27.6500,
    longitude: 85.2833,
    distance_km: 6.0,
    elevation_gain_m: 50,
    estimated_time_hours: 2.5,
  },
  {
    name: 'Godavari Botanical Garden Trail',
    description: 'Paved and well-maintained paths through the botanical gardens, ideal for family rides.',
    difficulty: 'easy',
    location: 'Godavari, Lalitpur',
    latitude: 27.6167,
    longitude: 85.3833,
    distance_km: 3.8,
    elevation_gain_m: 100,
    estimated_time_hours: 1.5,
  },
  {
    name: 'Patan Durbar Square Loop',
    description: 'A cultural ride through the historic Patan area with mostly flat terrain.',
    difficulty: 'easy',
    location: 'Patan, Lalitpur',
    latitude: 27.6767,
    longitude: 85.3250,
    distance_km: 4.2,
    elevation_gain_m: 80,
    estimated_time_hours: 1.8,
  },
  {
    name: 'Kirtipur Valley Trail',
    description: 'Gentle rolling hills through the traditional Newari town of Kirtipur.',
    difficulty: 'easy',
    location: 'Kirtipur, Kathmandu',
    latitude: 27.6833,
    longitude: 85.2833,
    distance_km: 5.5,
    elevation_gain_m: 180,
    estimated_time_hours: 2.2,
  },
  {
    name: 'Balkumari Temple Route',
    description: 'Easy trail connecting various temples in the valley with smooth paths.',
    difficulty: 'easy',
    location: 'Balkumari, Lalitpur',
    latitude: 27.6333,
    longitude: 85.3167,
    distance_km: 4.8,
    elevation_gain_m: 120,
    estimated_time_hours: 2.0,
  },
  {
    name: 'Pharping Monastery Trail',
    description: 'A peaceful ride to the Pharping monastery with gradual elevation.',
    difficulty: 'easy',
    location: 'Pharping, Kathmandu',
    latitude: 27.6167,
    longitude: 85.2833,
    distance_km: 5.0,
    elevation_gain_m: 160,
    estimated_time_hours: 2.0,
  },
  {
    name: 'Chobar Gorge Viewpoint',
    description: 'Easy trail to the scenic Chobar Gorge with minimal technical sections.',
    difficulty: 'easy',
    location: 'Chobar, Lalitpur',
    latitude: 27.6500,
    longitude: 85.3000,
    distance_km: 4.0,
    elevation_gain_m: 140,
    estimated_time_hours: 1.8,
  },
  {
    name: 'Boudhanath Stupa Circuit',
    description: 'Flat circuit around the famous Boudhanath Stupa area, perfect for beginners.',
    difficulty: 'easy',
    location: 'Boudha, Kathmandu',
    latitude: 27.7214,
    longitude: 85.3622,
    distance_km: 3.5,
    elevation_gain_m: 60,
    estimated_time_hours: 1.5,
  },
  {
    name: 'Swayambhunath Hill Base',
    description: 'Easy ride around the base of Monkey Temple with gentle slopes.',
    difficulty: 'easy',
    location: 'Swayambhu, Kathmandu',
    latitude: 27.7147,
    longitude: 85.2900,
    distance_km: 4.3,
    elevation_gain_m: 110,
    estimated_time_hours: 1.7,
  },
  {
    name: 'Nagarkot Sunrise View Trail',
    description: 'Early morning easy trail to catch the sunrise with gradual climbs.',
    difficulty: 'easy',
    location: 'Nagarkot, Bhaktapur',
    latitude: 27.7167,
    longitude: 85.5167,
    distance_km: 6.5,
    elevation_gain_m: 250,
    estimated_time_hours: 2.5,
  },
  {
    name: 'Thamel to Durbar Square',
    description: 'Urban trail connecting Thamel to Kathmandu Durbar Square, mostly flat.',
    difficulty: 'easy',
    location: 'Kathmandu',
    latitude: 27.7167,
    longitude: 85.3167,
    distance_km: 3.0,
    elevation_gain_m: 40,
    estimated_time_hours: 1.2,
  },
  {
    name: 'Bhaktapur Old City Loop',
    description: 'Cultural ride through the ancient city of Bhaktapur with easy terrain.',
    difficulty: 'easy',
    location: 'Bhaktapur',
    latitude: 27.6711,
    longitude: 85.4294,
    distance_km: 4.5,
    elevation_gain_m: 90,
    estimated_time_hours: 1.8,
  },
  {
    name: 'Tokha Valley Trail',
    description: 'Gentle trail through the Tokha valley with beautiful countryside views.',
    difficulty: 'easy',
    location: 'Tokha, Kathmandu',
    latitude: 27.7500,
    longitude: 85.3333,
    distance_km: 5.8,
    elevation_gain_m: 170,
    estimated_time_hours: 2.3,
  },

  // Medium Trails (20 trails)
  {
    name: 'Chandragiri Hill Climb',
    description: 'Moderate climb to Chandragiri Hill with cable car views and challenging sections.',
    difficulty: 'medium',
    location: 'Chandragiri, Kathmandu',
    latitude: 27.6667,
    longitude: 85.2333,
    distance_km: 8.5,
    elevation_gain_m: 600,
    estimated_time_hours: 3.5,
  },
  {
    name: 'Phulchowki Mountain Trail',
    description: 'Moderate to challenging trail up Phulchowki, the highest peak in the valley.',
    difficulty: 'medium',
    location: 'Phulchowki, Lalitpur',
    latitude: 27.5833,
    longitude: 85.3500,
    distance_km: 12.0,
    elevation_gain_m: 800,
    estimated_time_hours: 4.5,
  },
  {
    name: 'Shivapuri Peak Challenge',
    description: 'Moderate climb to Shivapuri peak with technical sections and rewarding views.',
    difficulty: 'medium',
    location: 'Shivapuri, Kathmandu',
    latitude: 27.8167,
    longitude: 85.3667,
    distance_km: 10.5,
    elevation_gain_m: 750,
    estimated_time_hours: 4.0,
  },
  {
    name: 'Nagarkot to Changunarayan',
    description: 'Moderate trail connecting Nagarkot to the ancient Changunarayan temple.',
    difficulty: 'medium',
    location: 'Nagarkot-Bhaktapur',
    latitude: 27.7167,
    longitude: 85.4500,
    distance_km: 9.0,
    elevation_gain_m: 500,
    estimated_time_hours: 3.5,
  },
  {
    name: 'Kakani Ridge Trail',
    description: 'Moderate ridge trail with technical descents and scenic mountain views.',
    difficulty: 'medium',
    location: 'Kakani, Nuwakot',
    latitude: 27.8333,
    longitude: 85.2500,
    distance_km: 11.5,
    elevation_gain_m: 650,
    estimated_time_hours: 4.2,
  },
  {
    name: 'Budhanilkantha to Shivapuri',
    description: 'Moderate connecting trail with mixed terrain and elevation changes.',
    difficulty: 'medium',
    location: 'Budhanilkantha-Shivapuri',
    latitude: 27.8000,
    longitude: 85.3667,
    distance_km: 8.0,
    elevation_gain_m: 550,
    estimated_time_hours: 3.2,
  },
  {
    name: 'Dakshinkali Temple Trail',
    description: 'Moderate trail to the famous Dakshinkali temple with challenging climbs.',
    difficulty: 'medium',
    location: 'Dakshinkali, Kathmandu',
    latitude: 27.6167,
    longitude: 85.2500,
    distance_km: 7.5,
    elevation_gain_m: 480,
    estimated_time_hours: 3.0,
  },
  {
    name: 'Bungamati to Kirtipur',
    description: 'Moderate trail connecting traditional Newari villages with varied terrain.',
    difficulty: 'medium',
    location: 'Bungamati-Kirtipur',
    latitude: 27.6667,
    longitude: 85.2833,
    distance_km: 6.8,
    elevation_gain_m: 420,
    estimated_time_hours: 2.8,
  },
  {
    name: 'Sankhu Valley Loop',
    description: 'Moderate loop through Sankhu valley with technical sections and descents.',
    difficulty: 'medium',
    location: 'Sankhu, Kathmandu',
    latitude: 27.7500,
    longitude: 85.4167,
    distance_km: 9.5,
    elevation_gain_m: 580,
    estimated_time_hours: 3.8,
  },
  {
    name: 'Tarebhir Hill Climb',
    description: 'Moderate climb to Tarebhir with rocky sections and rewarding summit views.',
    difficulty: 'medium',
    location: 'Tarebhir, Lalitpur',
    latitude: 27.6333,
    longitude: 85.3500,
    distance_km: 8.2,
    elevation_gain_m: 520,
    estimated_time_hours: 3.3,
  },
  {
    name: 'Jalpa Devi Temple Trail',
    description: 'Moderate trail to Jalpa Devi temple with mixed forest and open terrain.',
    difficulty: 'medium',
    location: 'Jalpa, Kathmandu',
    latitude: 27.6833,
    longitude: 85.3333,
    distance_km: 7.0,
    elevation_gain_m: 450,
    estimated_time_hours: 2.9,
  },
  {
    name: 'Balaju Water Garden to Budhanilkantha',
    description: 'Moderate connecting trail with rolling hills and technical sections.',
    difficulty: 'medium',
    location: 'Balaju-Budhanilkantha',
    latitude: 27.7500,
    longitude: 85.3500,
    distance_km: 6.5,
    elevation_gain_m: 380,
    estimated_time_hours: 2.7,
  },
  {
    name: 'Chobar to Pharping',
    description: 'Moderate trail connecting Chobar to Pharping with elevation changes.',
    difficulty: 'medium',
    location: 'Chobar-Pharping',
    latitude: 27.6167,
    longitude: 85.2833,
    distance_km: 7.8,
    elevation_gain_m: 500,
    estimated_time_hours: 3.2,
  },
  {
    name: 'Kapan Monastery Trail',
    description: 'Moderate climb to Kapan monastery with challenging sections and great views.',
    difficulty: 'medium',
    location: 'Kapan, Kathmandu',
    latitude: 27.7500,
    longitude: 85.3667,
    distance_km: 8.5,
    elevation_gain_m: 600,
    estimated_time_hours: 3.5,
  },
  {
    name: 'Balkumari to Godavari',
    description: 'Moderate trail through rural areas connecting Balkumari to Godavari.',
    difficulty: 'medium',
    location: 'Balkumari-Godavari',
    latitude: 27.6167,
    longitude: 85.3500,
    distance_km: 6.2,
    elevation_gain_m: 400,
    estimated_time_hours: 2.6,
  },
  {
    name: 'Nagarkot Ridge Loop',
    description: 'Moderate loop around Nagarkot ridge with technical descents and climbs.',
    difficulty: 'medium',
    location: 'Nagarkot, Bhaktapur',
    latitude: 27.7167,
    longitude: 85.5167,
    distance_km: 10.0,
    elevation_gain_m: 700,
    estimated_time_hours: 4.0,
  },
  {
    name: 'Thamel to Swayambhunath',
    description: 'Moderate urban to hill trail with elevation gain and technical sections.',
    difficulty: 'medium',
    location: 'Thamel-Swayambhu',
    latitude: 27.7167,
    longitude: 85.3000,
    distance_km: 5.5,
    elevation_gain_m: 350,
    estimated_time_hours: 2.5,
  },
  {
    name: 'Bhaktapur to Nagarkot',
    description: 'Moderate climb from Bhaktapur to Nagarkot with scenic countryside views.',
    difficulty: 'medium',
    location: 'Bhaktapur-Nagarkot',
    latitude: 27.7000,
    longitude: 85.4700,
    distance_km: 8.8,
    elevation_gain_m: 620,
    estimated_time_hours: 3.6,
  },
  {
    name: 'Kirtipur to Pharping',
    description: 'Moderate connecting trail with varied terrain and elevation changes.',
    difficulty: 'medium',
    location: 'Kirtipur-Pharping',
    latitude: 27.6500,
    longitude: 85.2833,
    distance_km: 7.2,
    elevation_gain_m: 480,
    estimated_time_hours: 3.0,
  },
  {
    name: 'Shivapuri Forest Loop',
    description: 'Moderate loop through Shivapuri forest with technical sections and climbs.',
    difficulty: 'medium',
    location: 'Shivapuri, Kathmandu',
    latitude: 27.8167,
    longitude: 85.3667,
    distance_km: 9.5,
    elevation_gain_m: 680,
    estimated_time_hours: 3.8,
  },

  // Hard Trails (15 trails)
  {
    name: 'Phulchowki Extreme Descent',
    description: 'Extremely challenging descent from Phulchowki peak with technical rock sections and steep drops.',
    difficulty: 'hard',
    location: 'Phulchowki, Lalitpur',
    latitude: 27.5833,
    longitude: 85.3500,
    distance_km: 15.0,
    elevation_gain_m: 1200,
    estimated_time_hours: 6.0,
  },
  {
    name: 'Shivapuri Extreme Challenge',
    description: 'Extremely difficult trail to Shivapuri peak with technical climbs and rocky terrain.',
    difficulty: 'hard',
    location: 'Shivapuri, Kathmandu',
    latitude: 27.8167,
    longitude: 85.3667,
    distance_km: 14.5,
    elevation_gain_m: 1100,
    estimated_time_hours: 5.5,
  },
  {
    name: 'Chandragiri Extreme Loop',
    description: 'Extremely challenging loop around Chandragiri with technical descents and climbs.',
    difficulty: 'hard',
    location: 'Chandragiri, Kathmandu',
    latitude: 27.6667,
    longitude: 85.2333,
    distance_km: 16.0,
    elevation_gain_m: 1300,
    estimated_time_hours: 6.5,
  },
  {
    name: 'Nagarkot to Bhaktapur Extreme',
    description: 'Extremely challenging trail with steep descents and technical sections.',
    difficulty: 'hard',
    location: 'Nagarkot-Bhaktapur',
    latitude: 27.7167,
    longitude: 85.4700,
    distance_km: 13.5,
    elevation_gain_m: 1000,
    estimated_time_hours: 5.0,
  },
  {
    name: 'Kakani Extreme Ridge',
    description: 'Extremely difficult ridge trail with exposure and technical rock sections.',
    difficulty: 'hard',
    location: 'Kakani, Nuwakot',
    latitude: 27.8333,
    longitude: 85.2500,
    distance_km: 18.0,
    elevation_gain_m: 1400,
    estimated_time_hours: 7.0,
  },
  {
    name: 'Phulchowki to Godavari Extreme',
    description: 'Extremely challenging connecting trail with massive elevation changes.',
    difficulty: 'hard',
    location: 'Phulchowki-Godavari',
    latitude: 27.6000,
    longitude: 85.3667,
    distance_km: 14.0,
    elevation_gain_m: 1150,
    estimated_time_hours: 5.8,
  },
  {
    name: 'Shivapuri to Kakani Extreme',
    description: 'Extremely difficult point-to-point trail connecting two major peaks.',
    difficulty: 'hard',
    location: 'Shivapuri-Kakani',
    latitude: 27.8250,
    longitude: 85.3000,
    distance_km: 17.5,
    elevation_gain_m: 1350,
    estimated_time_hours: 6.8,
  },
  {
    name: 'Nagarkot Extreme Loop',
    description: 'Extremely challenging loop around Nagarkot with technical descents and climbs.',
    difficulty: 'hard',
    location: 'Nagarkot, Bhaktapur',
    latitude: 27.7167,
    longitude: 85.5167,
    distance_km: 15.5,
    elevation_gain_m: 1250,
    estimated_time_hours: 6.2,
  },
  {
    name: 'Chandragiri Extreme Descent',
    description: 'Extremely technical descent from Chandragiri with steep drops and rock sections.',
    difficulty: 'hard',
    location: 'Chandragiri, Kathmandu',
    latitude: 27.6667,
    longitude: 85.2333,
    distance_km: 12.0,
    elevation_gain_m: 900,
    estimated_time_hours: 4.5,
  },
  {
    name: 'Phulchowki Full Circuit',
    description: 'Extremely challenging full circuit around Phulchowki with all technical features.',
    difficulty: 'hard',
    location: 'Phulchowki, Lalitpur',
    latitude: 27.5833,
    longitude: 85.3500,
    distance_km: 20.0,
    elevation_gain_m: 1500,
    estimated_time_hours: 8.0,
  },
  {
    name: 'Shivapuri Extreme Descent',
    description: 'Extremely technical descent from Shivapuri with challenging rock gardens.',
    difficulty: 'hard',
    location: 'Shivapuri, Kathmandu',
    latitude: 27.8167,
    longitude: 85.3667,
    distance_km: 13.0,
    elevation_gain_m: 950,
    estimated_time_hours: 4.8,
  },
  {
    name: 'Valley Extreme Circuit',
    description: 'Extremely challenging circuit connecting all major peaks in the valley.',
    difficulty: 'hard',
    location: 'Kathmandu Valley',
    latitude: 27.7000,
    longitude: 85.3167,
    distance_km: 25.0,
    elevation_gain_m: 1800,
    estimated_time_hours: 10.0,
  },
  {
    name: 'Kakani Extreme Challenge',
    description: 'Extremely difficult trail to Kakani with exposure and technical sections.',
    difficulty: 'hard',
    location: 'Kakani, Nuwakot',
    latitude: 27.8333,
    longitude: 85.2500,
    distance_km: 16.5,
    elevation_gain_m: 1280,
    estimated_time_hours: 6.5,
  },
  {
    name: 'Phulchowki Extreme Ascent',
    description: 'Extremely challenging climb to Phulchowki peak with technical rock sections.',
    difficulty: 'hard',
    location: 'Phulchowki, Lalitpur',
    latitude: 27.5833,
    longitude: 85.3500,
    distance_km: 14.5,
    elevation_gain_m: 1200,
    estimated_time_hours: 6.0,
  },
  {
    name: 'Triple Peak Challenge',
    description: 'Extremely difficult trail connecting Shivapuri, Nagarkot, and Phulchowki peaks.',
    difficulty: 'hard',
    location: 'Kathmandu Valley',
    latitude: 27.7000,
    longitude: 85.3500,
    distance_km: 22.0,
    elevation_gain_m: 1600,
    estimated_time_hours: 9.0,
  },
];

async function seedTrails() {
  try {
    console.log('Starting to seed trails...');

    // Check if trails already exist
    const checkResult = await pool.query('SELECT COUNT(*) FROM trails');
    const existingCount = parseInt(checkResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing trails.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        readline.question('Do you want to add these trails anyway? (y/N): ', resolve);
      });

      readline.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('Seeding cancelled.');
        await pool.end();
        process.exit(0);
      }
    }

    // Insert trails
    for (const trail of trails) {
      // Check if trail already exists (case-insensitive)
      const checkQuery = 'SELECT id FROM trails WHERE LOWER(name) = LOWER($1)';
      const checkResult = await pool.query(checkQuery, [trail.name]);

      if (checkResult.rows.length > 0) {
        console.log(`⊘ Skipped (already exists): ${trail.name}`);
        continue;
      }

      const query = `
        INSERT INTO trails (
          name, description, difficulty, location, latitude, longitude,
          distance_km, elevation_gain_m, estimated_time_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await pool.query(query, [
        trail.name,
        trail.description,
        trail.difficulty,
        trail.location,
        trail.latitude,
        trail.longitude,
        trail.distance_km,
        trail.elevation_gain_m,
        trail.estimated_time_hours,
      ]);

      console.log(`✓ Added: ${trail.name}`);
    }

    console.log(`\nSuccessfully seeded ${trails.length} trails!`);

    // Show summary
    const summary = await pool.query(`
      SELECT difficulty, COUNT(*) as count
      FROM trails
      GROUP BY difficulty
      ORDER BY difficulty
    `);

    console.log('\nTrail Summary:');
    summary.rows.forEach((row) => {
      console.log(`  ${row.difficulty}: ${row.count} trails`);
    });

  } catch (error) {
    console.error('Error seeding trails:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTrails();

