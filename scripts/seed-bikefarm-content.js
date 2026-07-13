const { runSeedScript, withPool } = require('./db-utils');

const BIKEFARM = {
  slug: 'bikefarm-nepal',
  name: 'The Bike Farm Nepal',
  tagline: 'Mountain bikes, accessories, maintenance, and rider support in Lalitpur',
  description:
    'The Bike Farm Nepal is listed on LocoXperts as a planned local support hub. The business is known for mountain bikes, cycling accessories, after-sales maintenance, rentals, and cycling activities. Confirm current stock, pricing, availability, and partnership details directly before booking or purchasing.',
  city: 'Lalitpur',
  country: 'Nepal',
  contact_phone: '9702615667',
};

const SERVICES = [
  {
    category: 'other',
    title: 'Mountain Bikes and Accessories',
    description:
      'Mountain bikes and cycling accessories for city riding, trail riding, and riders preparing for longer events.',
    price_note: 'Contact the store for current models, stock, and pricing',
    location: 'Jhamsikhel, Lalitpur',
  },
  {
    category: 'repair_support',
    title: 'After-sales Maintenance and Repair',
    description:
      'Maintenance, spare-part guidance, and after-sales support to help riders keep their bikes ready for regular and trail use.',
    price_note: 'Confirm the service scope and quote directly',
    location: 'Jhamsikhel, Lalitpur',
  },
  {
    category: 'bike_rental',
    title: 'Bike Rental Enquiries',
    description:
      'Rental bike enquiries for riders who want to try a bike or join a local ride without bringing their own cycle.',
    price_note: 'Availability and rental terms require confirmation',
    location: 'Lalitpur, Nepal',
  },
  {
    category: 'event_support',
    title: 'Cycling Activity Support',
    description:
      'Potential support for cycling rides, rallies, festivals, and local trail preparation activities.',
    price_note: 'Discuss event requirements directly',
    location: 'Kathmandu Valley, Nepal',
  },
];

const MARKETPLACE_ITEMS = [
  {
    title: 'Sunpeed One MTB - example listing',
    listing_type: 'cycle',
    category: 'MTB',
    condition: 'excellent',
    price_npr: 40000,
    location: 'Jhamsikhel, Lalitpur',
    fit_label: 'Confirm available sizes with the store',
    description:
      'Example marketplace listing based on a Bike Farm Nepal stock promotion. Confirm current stock, specification, warranty, and price directly before purchase.',
    highlights: ['1x9 Shimano gear', 'Hydraulic disc brakes', 'Hydraulic lockout fork'],
    image_url: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Trail MTB accessories - example listing',
    listing_type: 'accessory',
    category: 'Other',
    condition: 'excellent',
    price_npr: 0,
    location: 'Jhamsikhel, Lalitpur',
    fit_label: 'Ask for available brands and sizes',
    description:
      'Example listing for trail accessories from the Bike Farm Nepal catalog. Contact the store for current items, prices, and availability.',
    highlights: ['Cycling accessories', 'Trail riding equipment', 'Stock varies'],
    image_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'MTB spare parts - example listing',
    listing_type: 'part',
    category: 'Other',
    condition: 'good',
    price_npr: 0,
    location: 'Jhamsikhel, Lalitpur',
    fit_label: 'Confirm compatibility before purchase',
    description:
      'Example marketplace listing for mountain-bike spare parts and maintenance items. Confirm the part specification and current price directly with the store.',
    highlights: ['Spare-part guidance', 'Mountain-bike focused', 'Compatibility check recommended'],
    image_url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80',
  },
];

const CAMPAIGN = {
  title: 'Kora 2026 Trail Readiness Support - Example',
  description:
    'Example campaign concept for coordinating bike checks, rider preparation, and local trail support before Kora 2026. This draft is not open for contributions until Bikefarm and LocoXperts confirm the plan.',
  target_amount_npr: 200000,
  status: 'paused',
  payment_note: 'Example only - confirm campaign details before publishing.',
};

const RIDE_PROGRAM = {
  title: 'Ride with LocoXperts to Kotdada',
  description:
    'A guided local ride to Kotdada with a LocoXperts expert. Confirm the route, weather, meeting point, fitness level, and final availability before accepting a request.',
  max_group_size: 6,
  duration_note: 'Half day; confirm timing after request',
  meeting_point_note: 'Meeting point shared after the ride request is reviewed',
  skill_level: 'intermediate',
  program_type: 'guided_ride',
};

async function getRequiredRecords(client) {
  const expertResult = await client.query(
    `
    SELECT id, name, email
    FROM users
    WHERE lower(email) = 'locoxperts@gmail.com'
      AND role = 'expert'
      AND is_verified_expert = TRUE
    LIMIT 1
    `
  );
  const trailResult = await client.query(
    `
    SELECT id, name
    FROM trails
    WHERE slug = 'kotdada-2'
      AND status = 'approved'
      AND COALESCE(is_hidden, FALSE) = FALSE
    LIMIT 1
    `
  );

  if (!expertResult.rows[0]) throw new Error('Verified LocoXperts expert user was not found.');
  if (!trailResult.rows[0]) throw new Error('Approved Kotdada trail was not found.');
  return { expert: expertResult.rows[0], trail: trailResult.rows[0] };
}

async function ensureOrganization(client, ownerUserId) {
  const result = await client.query(
    `
    INSERT INTO organizations (
      slug, name, tagline, description, contact_phone, city, country,
      is_verified, is_active, created_by_user_id, owner_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, TRUE, $8, $8)
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      contact_phone = EXCLUDED.contact_phone,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      is_verified = FALSE,
      is_active = TRUE,
      owner_user_id = EXCLUDED.owner_user_id,
      updated_at = NOW()
    RETURNING id, slug
    `,
    [
      BIKEFARM.slug,
      BIKEFARM.name,
      BIKEFARM.tagline,
      BIKEFARM.description,
      BIKEFARM.contact_phone,
      BIKEFARM.city,
      BIKEFARM.country,
      ownerUserId,
    ]
  );

  await client.query(
    `
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES ($1, $2, 'org_owner', 'active')
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'org_owner', status = 'active', updated_at = NOW()
    `,
    [result.rows[0].id, ownerUserId]
  );
  return result.rows[0];
}

async function ensureServices(client, organizationId, creatorUserId) {
  for (const service of SERVICES) {
    await client.query(
      `
      INSERT INTO organization_services (
        organization_id, created_by_user_id, category, title, description,
        price_note, location, contact_phone, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      ON CONFLICT (organization_id, title) DO UPDATE SET
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        price_note = EXCLUDED.price_note,
        location = EXCLUDED.location,
        contact_phone = EXCLUDED.contact_phone,
        is_active = TRUE,
        updated_at = NOW()
      `,
      [
        organizationId,
        creatorUserId,
        service.category,
        service.title,
        service.description,
        service.price_note,
        service.location,
        BIKEFARM.contact_phone,
      ]
    );
  }
}

async function ensureCampaign(client, organizationId, creatorUserId) {
  const existing = await client.query(
    `SELECT id FROM fundraising_campaigns WHERE organization_id = $1 AND title = $2 LIMIT 1`,
    [organizationId, CAMPAIGN.title]
  );
  if (existing.rows[0]) {
    await client.query(
      `
      UPDATE fundraising_campaigns
      SET description = $2, target_amount_npr = $3, payment_note = $4,
          status = $5, updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        CAMPAIGN.description,
        CAMPAIGN.target_amount_npr,
        CAMPAIGN.payment_note,
        CAMPAIGN.status,
      ]
    );
    return;
  }

  await client.query(
    `
    INSERT INTO fundraising_campaigns (
      organization_id, title, description, target_amount_npr,
      raised_amount_npr, payment_note, status, created_by_user_id
    )
    VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
    `,
    [
      organizationId,
      CAMPAIGN.title,
      CAMPAIGN.description,
      CAMPAIGN.target_amount_npr,
      CAMPAIGN.payment_note,
      CAMPAIGN.status,
      creatorUserId,
    ]
  );
}

async function ensureMarketplaceItems(client, ownerUserId) {
  for (const item of MARKETPLACE_ITEMS) {
    const existing = await client.query(
      `SELECT id FROM marketplace_listings WHERE owner_user_id = $1 AND title = $2 LIMIT 1`,
      [ownerUserId, item.title]
    );
    let listingId = existing.rows[0]?.id;
    if (listingId) {
      await client.query(
        `
        UPDATE marketplace_listings
        SET listing_type = $2, category = $3, condition = $4, price_npr = $5,
            location = $6, fit_label = $7, description = $8, highlights = $9::text[],
            contact_methods = ARRAY['phone']::text[], contact_value = $10,
            status = 'active', sold_at = NULL, deleted_at = NULL, updated_at = NOW()
        WHERE id = $1
        `,
        [
          listingId,
          item.listing_type,
          item.category,
          item.condition,
          item.price_npr,
          item.location,
          item.fit_label,
          item.description,
          item.highlights,
          BIKEFARM.contact_phone,
        ]
      );
    } else {
      const inserted = await client.query(
        `
        INSERT INTO marketplace_listings (
          owner_user_id, title, listing_type, category, condition, price_npr,
          location, fit_label, description, highlights, contact_methods, contact_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], ARRAY['phone']::text[], $11)
        RETURNING id
        `,
        [
          ownerUserId,
          item.title,
          item.listing_type,
          item.category,
          item.condition,
          item.price_npr,
          item.location,
          item.fit_label,
          item.description,
          item.highlights,
          BIKEFARM.contact_phone,
        ]
      );
      listingId = inserted.rows[0].id;
    }

    await client.query('DELETE FROM marketplace_listing_images WHERE listing_id = $1', [listingId]);
    await client.query(
      `INSERT INTO marketplace_listing_images (listing_id, image_url, sort_order) VALUES ($1, $2, 0)`,
      [listingId, item.image_url]
    );
  }
}

async function ensureRideProgram(client, organizationId, creatorUserId, expert, trail) {
  await client.query(
    `
    INSERT INTO expert_ride_programs (
      expert_user_id, trail_id, organization_id, created_by_user_id, title,
      program_type, description, price_npr, max_group_size, duration_note,
      meeting_point_note, availability_weekdays, available_time_note, skill_level, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11::jsonb, $12, $13, TRUE)
    ON CONFLICT (expert_user_id, trail_id, title) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      created_by_user_id = EXCLUDED.created_by_user_id,
      description = EXCLUDED.description,
      max_group_size = EXCLUDED.max_group_size,
      duration_note = EXCLUDED.duration_note,
      meeting_point_note = EXCLUDED.meeting_point_note,
      availability_weekdays = EXCLUDED.availability_weekdays,
      available_time_note = EXCLUDED.available_time_note,
      skill_level = EXCLUDED.skill_level,
      is_active = TRUE,
      updated_at = NOW()
    `,
    [
      expert.id,
      trail.id,
      organizationId,
      creatorUserId,
      RIDE_PROGRAM.title,
      RIDE_PROGRAM.program_type,
      RIDE_PROGRAM.description,
      RIDE_PROGRAM.max_group_size,
      RIDE_PROGRAM.duration_note,
      RIDE_PROGRAM.meeting_point_note,
      JSON.stringify(['saturday', 'sunday']),
      'Early morning; confirm after request',
      RIDE_PROGRAM.skill_level,
    ]
  );
}

async function seedBikefarmContent() {
  return withPool(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const records = await getRequiredRecords(client);
      const organization = await ensureOrganization(client, records.expert.id);
      await ensureServices(client, organization.id, records.expert.id);
      await ensureCampaign(client, organization.id, records.expert.id);
      await ensureMarketplaceItems(client, records.expert.id);
      await ensureRideProgram(client, organization.id, records.expert.id, records.expert, records.trail);
      await client.query('COMMIT');
      console.log(`Bikefarm organization ready: /organizations/${organization.slug}`);
      console.log(`Marketplace examples ready: ${MARKETPLACE_ITEMS.length}`);
      console.log(`Ride program ready: ${RIDE_PROGRAM.title} on ${records.trail.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

runSeedScript(seedBikefarmContent, 'Bikefarm content');
