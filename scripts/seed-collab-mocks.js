const { runSeedScript, withPool } = require('./db-utils');

const TRAIL_BUILDERS_NEPAL = {
  slug: 'trail-builders-nepal',
  name: 'Trail Builders Nepal',
  tagline: 'Building and maintaining sustainable mountain trails',
  description:
    'Community-led trail building and maintenance with a focus on safe, sustainable riding in Nepal.',
  city: 'Kathmandu',
  country: 'Nepal',
};

const TBN_USERS = [
  {
    name: 'Sujan Karki',
    email: 'sujan.karki.tbn@mtbtrailfinder.app',
    password_hash: 'mock-hash-not-for-auth',
    role: 'expert',
    city: 'Kathmandu',
    bio: 'Trail builder and organization admin focused on enduro line maintenance.',
    sports: ['mtb'],
    memberRole: 'org_admin',
  },
  {
    name: 'Anita Shrestha',
    email: 'anita.shrestha.tbn@mtbtrailfinder.app',
    password_hash: 'mock-hash-not-for-auth',
    role: 'expert',
    city: 'Lalitpur',
    bio: 'Trail builder editor coordinating route notes, services, and campaign updates.',
    sports: ['mtb'],
    memberRole: 'org_editor',
  },
];

// TBN_TRAILS removed - we'll use existing trails associated with TBN organization

const TBN_CAMPAIGNS = [
  {
    trailIndex: 0, // Will map to first associated trail
    title: 'Chituwa Trail Drainage Refresh',
    description:
      'Refresh drainage, re-cut berms, and improve safety markers on the Chituwa trail.',
    target_amount_npr: 480000,
    raised_amount_npr: 210000,
    payment_note: 'Use reference: TBN-CHITUWA-2026',
    status: 'active',
    starts_at: '2026-06-01T00:00:00.000Z',
    ends_at: '2026-07-31T23:59:59.000Z',
  },
  {
    trailIndex: 1, // Will map to second associated trail
    title: 'Bindhyabasini Rescue Marker Upgrade',
    description:
      'Add route markers, emergency waypoints, and service support signage along the Bindhyabasini trail.',
    target_amount_npr: 360000,
    raised_amount_npr: 96000,
    payment_note: 'Use reference: TBN-BINDHYABASINI-2026',
    status: 'paused',
    starts_at: '2026-08-01T00:00:00.000Z',
    ends_at: '2026-09-30T23:59:59.000Z',
  },
  {
    trailIndex: 2, // Will map to third associated trail
    title: 'Hattiban Community Dig Day',
    description:
      'Community dig sessions to improve flow, clear drainage, and stabilize technical sections.',
    target_amount_npr: 240000,
    raised_amount_npr: 45000,
    payment_note: 'Use reference: TBN-HATTIBAN-2026',
    status: 'draft',
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-11-30T23:59:59.000Z',
  },
];

const TBN_SERVICES = [
  {
    trailIndex: 0, // Will map to first associated trail
    service_type: 'shuttle',
    title: 'Chituwa Shuttle Window',
    description: 'Weekend shuttle runs for the Chituwa trail.',
    contact_phone: '+977 9801112233',
    contact_whatsapp: 'https://wa.me/9779801112233',
    contact_email: 'shuttle@trailbuildersnepal.app',
    price_note: 'From NPR 1200 per rider',
    schedule_note: 'Sat-Sun, 6:30 AM - 1:30 PM',
  },
  {
    trailIndex: 1, // Will map to second associated trail
    service_type: 'lift',
    title: 'Bindhyabasini Lift Support',
    description: 'Vehicle support for uphill laps and shuttle-assisted descents.',
    contact_phone: '+977 9801112244',
    contact_whatsapp: 'https://wa.me/9779801112244',
    contact_email: 'lift@trailbuildersnepal.app',
    price_note: 'Group dependent',
    schedule_note: 'Daily, pre-book only',
  },
  {
    trailIndex: 2, // Will map to third associated trail
    service_type: 'support_vehicle',
    title: 'Hattiban Support Vehicle',
    description: 'Support vehicle and recovery assistance for long maintenance days.',
    contact_phone: '+977 9801112255',
    contact_whatsapp: 'https://wa.me/9779801112255',
    contact_email: 'support@trailbuildersnepal.app',
    price_note: 'By arrangement',
    schedule_note: 'Weekends and event days',
  },
];

const TBN_TRAIL_UPDATES = [
  {
    trailIndex: 0,
    update_type: 'condition_update',
    title: 'Post-monsoon drainage assessment complete',
    details: 'Checked all drainage points along the Chituwa trail. Main flow channels are clear but some side drains need clearing before peak season.',
    media_urls: ['https://images.unsplash.com/photo-1544191696-15693ddad33b'],
  },
  {
    trailIndex: 0,
    update_type: 'maintenance_done',
    title: 'Rock garden armored and smoothed',
    details: 'Added armoring to the technical rock garden section. Smoothed out the entry line for better flow while maintaining technical challenge.',
    media_urls: ['https://images.unsplash.com/photo-1517940310602-26535839fe84'],
  },
  {
    trailIndex: 1,
    update_type: 'hazard_reported',
    title: 'Fallen tree section near viewpoint',
    details: 'Large fallen tree blocking the line near the main viewpoint. Temporary bypass created, removal scheduled for weekend maintenance crew.',
    media_urls: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'],
  },
  {
    trailIndex: 1,
    update_type: 'hazard_cleared',
    title: 'Fallen tree removed and trail restored',
    details: 'Weekend crew successfully removed the fallen tree. Original line restored, minor erosion control added to prevent future issues.',
    media_urls: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb'],
  },
  {
    trailIndex: 2,
    update_type: 'maintenance_done',
    title: 'Berm reconstruction on lower flow section',
    details: 'Rebuilt three major berms on the lower section. Improved drainage and added compacting for durability through rainy season.',
    media_urls: ['https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99'],
  },
  {
    trailIndex: 2,
    update_type: 'condition_update',
    title: 'Trail condition rating: Good',
    details: 'Overall trail condition excellent after recent maintenance work. All technical sections riding well, vegetation trimmed back from riding line.',
    media_urls: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'],
  },
];

async function ensureUser(client, user) {
  const result = await client.query(
    `
    INSERT INTO users (name, email, password_hash, role, city, bio, sports, is_verified_expert)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      city = EXCLUDED.city,
      bio = EXCLUDED.bio,
      sports = EXCLUDED.sports,
      is_verified_expert = TRUE,
      updated_at = NOW()
    RETURNING id
    `,
    [
      user.name,
      user.email,
      user.password_hash,
      user.role,
      user.city,
      user.bio,
      JSON.stringify(user.sports),
    ]
  );

  return result.rows[0].id;
}

async function ensureOrganization(client, adminUserId) {
  const result = await client.query(
    `
    INSERT INTO organizations (
      slug,
      name,
      tagline,
      description,
      city,
      country,
      is_verified,
      is_active,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7)
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      is_verified = TRUE,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING id
    `,
    [
      TRAIL_BUILDERS_NEPAL.slug,
      TRAIL_BUILDERS_NEPAL.name,
      TRAIL_BUILDERS_NEPAL.tagline,
      TRAIL_BUILDERS_NEPAL.description,
      TRAIL_BUILDERS_NEPAL.city,
      TRAIL_BUILDERS_NEPAL.country,
      adminUserId,
    ]
  );

  return result.rows[0].id;
}

async function ensureMember(client, organizationId, userId, role) {
  await client.query(
    `
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES ($1, $2, $3, 'active')
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
    `,
    [organizationId, userId, role]
  );
}

// ensureTrail and ensureTrailAssociation removed - we use existing trail associations

async function ensureCampaign(client, organizationId, trailId, userId, campaign) {
  const existing = await client.query(
    `
    SELECT id
    FROM fundraising_campaigns
    WHERE organization_id = $1
      AND title = $2
    LIMIT 1
    `,
    [organizationId, campaign.title]
  );

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE fundraising_campaigns
      SET
        trail_id = $2,
        description = $3,
        target_amount_npr = $4,
        raised_amount_npr = $5,
        qr_image_url = $6,
        payment_note = $7,
        status = $8,
        starts_at = $9,
        ends_at = $10,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        trailId,
        campaign.description,
        campaign.target_amount_npr,
        campaign.raised_amount_npr,
        '/donate/esewa-qr.svg',
        campaign.payment_note,
        campaign.status,
        campaign.starts_at,
        campaign.ends_at,
      ]
    );
    return false;
  }

  await client.query(
    `
    INSERT INTO fundraising_campaigns (
      organization_id,
      trail_id,
      title,
      description,
      target_amount_npr,
      raised_amount_npr,
      qr_image_url,
      payment_note,
      status,
      starts_at,
      ends_at,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      organizationId,
      trailId,
      campaign.title,
      campaign.description,
      campaign.target_amount_npr,
      campaign.raised_amount_npr,
      '/donate/esewa-qr.svg',
      campaign.payment_note,
      campaign.status,
      campaign.starts_at,
      campaign.ends_at,
      userId,
    ]
  );
  return true;
}

async function ensureService(client, organizationId, trailId, userId, service) {
  const existing = await client.query(
    `
    SELECT id
    FROM trail_services
    WHERE trail_id = $1
      AND organization_id = $2
      AND title = $3
    LIMIT 1
    `,
    [trailId, organizationId, service.title]
  );

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE trail_services
      SET
        service_type = $2,
        description = $3,
        contact_phone = $4,
        contact_whatsapp = $5,
        contact_email = $6,
        price_note = $7,
        schedule_note = $8,
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        service.service_type,
        service.description,
        service.contact_phone,
        service.contact_whatsapp,
        service.contact_email,
        service.price_note,
        service.schedule_note,
      ]
    );
    return false;
  }

  await client.query(
    `
    INSERT INTO trail_services (
      trail_id,
      organization_id,
      service_type,
      title,
      description,
      contact_phone,
      contact_whatsapp,
      contact_email,
      price_note,
      schedule_note,
      is_active,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11)
    `,
    [
      trailId,
      organizationId,
      service.service_type,
      service.title,
      service.description,
      service.contact_phone,
      service.contact_whatsapp,
      service.contact_email,
      service.price_note,
      service.schedule_note,
      userId,
    ]
  );
  return true;
}

async function ensureTrailUpdate(client, trailId, organizationId, userId, update) {
  const existing = await client.query(
    `
    SELECT id
    FROM trail_update_logs
    WHERE trail_id = $1
      AND organization_id = $2
      AND title = $3
    LIMIT 1
    `,
    [trailId, organizationId, update.title]
  );

  if (existing.rows.length) {
    return false;
  }

  await client.query(
    `
    INSERT INTO trail_update_logs (
      trail_id,
      organization_id,
      actor_user_id,
      update_type,
      title,
      details,
      media_urls
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      trailId,
      organizationId,
      userId,
      update.update_type,
      update.title,
      update.details,
      JSON.stringify(update.media_urls),
    ]
  );
  return true;
}

async function seedTrailBuildersNepal() {
  return withPool(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const adminUserId = await ensureUser(client, TBN_USERS[0]);
      const editorUserId = await ensureUser(client, TBN_USERS[1]);
      const organizationId = await ensureOrganization(client, adminUserId);

      await ensureMember(client, organizationId, adminUserId, 'org_admin');
      await ensureMember(client, organizationId, editorUserId, 'org_editor');

      // Query existing trails associated with TBN organization
      const trailsResult = await client.query(
        `
        SELECT t.id, t.slug, t.name
        FROM trails t
        JOIN trail_organizations trail_org ON t.id = trail_org.trail_id
        WHERE trail_org.organization_id = $1
        ORDER BY t.created_at ASC
        `,
        [organizationId]
      );

      if (trailsResult.rows.length === 0) {
        throw new Error('No trails found associated with TBN organization. Please associate trails first.');
      }

      const associatedTrails = trailsResult.rows;
      console.log(`Found ${associatedTrails.length} trails associated with TBN:`);
      associatedTrails.forEach(trail => console.log(`  - ${trail.name} (${trail.slug})`));

      const campaignResults = [];
      for (const campaign of TBN_CAMPAIGNS) {
        if (campaign.trailIndex >= associatedTrails.length) {
          console.warn(`Skipping campaign "${campaign.title}" - trail index ${campaign.trailIndex} out of range`);
          continue;
        }
        const trailId = associatedTrails[campaign.trailIndex].id;
        campaignResults.push(
          await ensureCampaign(client, organizationId, trailId, adminUserId, campaign)
        );
      }

      const serviceResults = [];
      for (const service of TBN_SERVICES) {
        if (service.trailIndex >= associatedTrails.length) {
          console.warn(`Skipping service "${service.title}" - trail index ${service.trailIndex} out of range`);
          continue;
        }
        const trailId = associatedTrails[service.trailIndex].id;
        serviceResults.push(await ensureService(client, organizationId, trailId, adminUserId, service));
      }

      const updateResults = [];
      for (const update of TBN_TRAIL_UPDATES) {
        if (update.trailIndex >= associatedTrails.length) {
          console.warn(`Skipping update "${update.title}" - trail index ${update.trailIndex} out of range`);
          continue;
        }
        const trailId = associatedTrails[update.trailIndex].id;
        updateResults.push(await ensureTrailUpdate(client, trailId, organizationId, adminUserId, update));
      }

      await client.query('COMMIT');

      console.log('Trail Builders Nepal seed completed successfully.');
      console.log(`- Organization: ${TRAIL_BUILDERS_NEPAL.slug}`);
      console.log(`- Users: ${TBN_USERS.length}`);
      console.log(`- Trails used: ${associatedTrails.length}`);
      console.log(`- Campaigns inserted: ${campaignResults.filter(Boolean).length}`);
      console.log(`- Services inserted: ${serviceResults.filter(Boolean).length}`);
      console.log(`- Trail updates inserted: ${updateResults.filter(Boolean).length}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

module.exports = seedTrailBuildersNepal;

if (require.main === module) {
  runSeedScript(seedTrailBuildersNepal, 'trail builders nepal');
}
