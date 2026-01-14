const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mtb_trail_finder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedMarketplace() {
  const client = await pool.connect();

  try {
    console.log('Seeding marketplace data (users, trails, events, reviews)...');

    await client.query('BEGIN');

    // Seed users (experts and participants)
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      {
        name: 'Suman Gurung',
        email: 'suman.expert@example.com',
        role: 'expert',
        city: 'Kathmandu',
        sports: ['mtb', 'trail_running'],
        bio: 'Local MTB guide and trail runner with 8+ years of experience around Kathmandu Valley.',
        is_verified_expert: true,
      },
      {
        name: 'Maya Thapa',
        email: 'maya.guide@example.com',
        role: 'expert',
        city: 'Pokhara',
        sports: ['mtb', 'hiking', 'local_tour'],
        bio: 'Pokhara-based guide leading lakeside rides, Sarangkot sunrise hikes, and local cultural tours.',
        is_verified_expert: true,
      },
      {
        name: 'Rinzin Lama',
        email: 'rinzin.coach@example.com',
        role: 'expert',
        city: 'Kathmandu',
        sports: ['training', 'mtb'],
        bio: 'Cycling coach focused on endurance and climbing sessions around Kapan and Shivapuri.',
        is_verified_expert: false,
      },
      {
        name: 'Alex Rider',
        email: 'alex.participant@example.com',
        role: 'participant',
        city: 'Kathmandu',
        sports: ['mtb'],
        bio: 'Visiting rider looking to explore technical singletrack around the valley.',
        is_verified_expert: false,
      },
      {
        name: 'Sara Trail',
        email: 'sara.participant@example.com',
        role: 'participant',
        city: 'Pokhara',
        sports: ['hiking', 'trail_running'],
        bio: 'Trail runner excited to discover Pokhara ridge lines.',
        is_verified_expert: false,
      },
    ];

    const userIdByEmail = {};

    for (const user of users) {
      // Serialize sports to JSON string for insertion into Postgres JSON/JSONB column
      const sportsJson = JSON.stringify(user.sports);

      const res = await client.query(
        `
        INSERT INTO users (name, email, password_hash, role, bio, city, sports, is_verified_expert)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          bio = EXCLUDED.bio,
          city = EXCLUDED.city,
          sports = EXCLUDED.sports,
          is_verified_expert = EXCLUDED.is_verified_expert
        RETURNING id
      `,
        [
          user.name,
          user.email,
          passwordHash,
          user.role,
          user.bio,
          user.city,
          sportsJson,
          user.is_verified_expert,
        ]
      );

      userIdByEmail[user.email] = res.rows[0].id;
    }

    console.log('✓ Seeded users (experts and participants)');

    // Seed a few Pokhara trails if they do not exist
    const pokharaTrails = [
      {
        name: 'Lakeside to World Peace Pagoda',
        description:
          'Scenic ride from Phewa Lakeside up to the World Peace Pagoda with lake and Annapurna views.',
        difficulty: 'medium',
        location: 'Pokhara',
        latitude: 28.2096,
        longitude: 83.9856,
        distance_km: 10.5,
        elevation_gain_m: 520,
        estimated_time_hours: 3.0,
      },
      {
        name: 'Sarangkot Sunrise Ridge',
        description:
          'Classic pre-dawn climb to Sarangkot for sunrise over Machhapuchhre and the Annapurnas.',
        difficulty: 'medium',
        location: 'Sarangkot, Pokhara',
        latitude: 28.2403,
        longitude: 83.9678,
        distance_km: 12.0,
        elevation_gain_m: 800,
        estimated_time_hours: 4.0,
      },
      {
        name: 'Begnas Lake Country Loop',
        description:
          'Rolling country-side loop around Begnas Lake with quiet roads and village trails.',
        difficulty: 'easy',
        location: 'Begnas, Pokhara',
        latitude: 28.1325,
        longitude: 84.1108,
        distance_km: 9.0,
        elevation_gain_m: 300,
        estimated_time_hours: 2.5,
      },
    ];

    const trailIdByName = {};

    for (const trail of pokharaTrails) {
      const existing = await client.query(
        'SELECT id FROM trails WHERE LOWER(name) = LOWER($1)',
        [trail.name]
      );

      if (existing.rows.length > 0) {
        trailIdByName[trail.name] = existing.rows[0].id;
        continue;
      }

      const res = await client.query(
        `
        INSERT INTO trails (
          name, description, difficulty, location, latitude, longitude,
          distance_km, elevation_gain_m, estimated_time_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
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
        ]
      );

      trailIdByName[trail.name] = res.rows[0].id;
    }

    console.log('✓ Seeded Pokhara trails (if missing)');

    // Seed a couple of upcoming events hosted by experts
    const now = new Date();
    const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const events = [
      {
        title: 'Pokhara Lakeside Evening MTB Flow',
        description:
          'Intermediate-friendly lakeside ride with mellow climbs and flowy descents. Perfect warm-up for your Pokhara trip.',
        trailName: 'Lakeside to World Peace Pagoda',
        event_date: inDays(5),
        organizer_name: 'Maya Thapa',
        organizer_email: 'maya.guide@example.com',
        max_participants: 8,
        meeting_point: 'Phewa Lakeside, Pokhara',
        difficulty: 'medium',
        required_expertise: 'intermediate',
        sport_type: 'mtb',
        city: 'Pokhara',
        price_npr: 3500,
        host_email: 'maya.guide@example.com',
      },
      {
        title: 'Kathmandu Kapan Morning Climb & Skills',
        description:
          'Climbing-focused MTB skills session around Kapan with intervals and descending drills.',
        trailName: 'Kapan Monastery Trail',
        event_date: inDays(3),
        organizer_name: 'Rinzin Lama',
        organizer_email: 'rinzin.coach@example.com',
        max_participants: 6,
        meeting_point: 'Kapan Monastery Gate, Kathmandu',
        difficulty: 'medium',
        required_expertise: 'intermediate',
        sport_type: 'training',
        city: 'Kathmandu',
        price_npr: 2500,
        host_email: 'rinzin.coach@example.com',
      },
      {
        title: 'Sarangkot Sunrise Hike & Local Breakfast',
        description:
          'Guided sunrise hike to Sarangkot with local breakfast and storytelling from a Pokhara-based guide.',
        trailName: 'Sarangkot Sunrise Ridge',
        event_date: inDays(10),
        organizer_name: 'Maya Thapa',
        organizer_email: 'maya.guide@example.com',
        max_participants: 10,
        meeting_point: 'Lakeside Bus Park, Pokhara',
        difficulty: 'medium',
        required_expertise: 'beginner',
        sport_type: 'hiking',
        city: 'Pokhara',
        price_npr: 3000,
        host_email: 'maya.guide@example.com',
      },
    ];

    const eventIdByTitle = {};

    for (const ev of events) {
      const hostUserId = userIdByEmail[ev.host_email];
      const trailId =
        trailIdByName[ev.trailName] ||
        (await (async () => {
          const r = await client.query(
            'SELECT id FROM trails WHERE LOWER(name) = LOWER($1)',
            [ev.trailName]
          );
          return r.rows[0]?.id || null;
        })());

      const existing = await client.query(
        'SELECT id FROM events WHERE title = $1 AND city = $2',
        [ev.title, ev.city]
      );

      if (existing.rows.length > 0) {
        eventIdByTitle[ev.title] = existing.rows[0].id;
        continue;
      }

      const res = await client.query(
        `
        INSERT INTO events (
          title,
          description,
          trail_id,
          event_date,
          organizer_name,
          organizer_email,
          max_participants,
          current_participants,
          meeting_point,
          difficulty,
          required_expertise,
          sport_type,
          city,
          price_npr,
          host_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `,
        [
          ev.title,
          ev.description,
          trailId,
          ev.event_date,
          ev.organizer_name,
          ev.organizer_email,
          ev.max_participants,
          ev.meeting_point,
          ev.difficulty,
          ev.required_expertise,
          ev.sport_type,
          ev.city,
          ev.price_npr,
          hostUserId || null,
        ]
      );

      eventIdByTitle[ev.title] = res.rows[0].id;
    }

    console.log('✓ Seeded sample future events in Kathmandu & Pokhara');

    // Seed a few reviews from participants for verified experts
    const reviews = [
      {
        eventTitle: 'Pokhara Lakeside Evening MTB Flow',
        reviewerEmail: 'sara.participant@example.com',
        rating: 5,
        comment:
          'Amazing flowy ride with beautiful lake views. Maya picked perfect lines and set a comfortable pace.',
      },
      {
        eventTitle: 'Sarangkot Sunrise Hike & Local Breakfast',
        reviewerEmail: 'alex.participant@example.com',
        rating: 5,
        comment:
          'Unbelievable sunrise and very well organized. Felt safe and taken care of the whole time.',
      },
    ];

    for (const review of reviews) {
      const eventId = eventIdByTitle[review.eventTitle];
      const reviewerId = userIdByEmail[review.reviewerEmail];

      if (!eventId || !reviewerId) continue;

      const existing = await client.query(
        `
        SELECT id
        FROM reviews
        WHERE event_id = $1 AND reviewer_user_id = $2
      `,
        [eventId, reviewerId]
      );

      if (existing.rows.length > 0) {
        continue;
      }

      await client.query(
        `
        INSERT INTO reviews (event_id, reviewer_user_id, rating, comment)
        VALUES ($1, $2, $3, $4)
      `,
        [eventId, reviewerId, review.rating, review.comment]
      );
    }

    console.log('✓ Seeded example reviews for verified experts');

    await client.query('COMMIT');
    console.log('✅ Marketplace seed completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding marketplace data:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMarketplace();


